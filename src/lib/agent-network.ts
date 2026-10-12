import { lookup } from "node:dns/promises";
import { request } from "node:https";
import ipaddr from "ipaddr.js";

export function isPublicAddress(address: string) {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}
export function allowedTarget(raw: string, origin?: string) {
  const u = new URL(raw);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    (origin && u.origin !== origin)
  )
    throw new Error(
      "Only credential-free HTTPS URLs on the buyer-approved origin are allowed.",
    );
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    (ipaddr.isValid(host) && !isPublicAddress(host))
  )
    throw new Error("Private and local network targets are blocked.");
  return u;
}
export async function safePageGet(raw: string, origin: string) {
  const u = allowedTarget(raw, origin);
  const addresses = await lookup(u.hostname, { all: true });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new Error("Target resolves to a non-public address.");
  const chosen = addresses[0];
  // Pin the validated address; keep TLS certificate checks against the original hostname.
  return new Promise<{
    status: number;
    headers: Record<string, string>;
    body: Buffer;
  }>((resolve, reject) => {
    const req = request(
      {
        hostname: chosen.address,
        family: chosen.family,
        servername: u.hostname,
        method: "GET",
        path: u.pathname + u.search,
        headers: {
          Host: u.host,
          "User-Agent": "PaylockVerification/1.0",
          Accept: "*/*",
          "Accept-Encoding": "identity",
        },
        timeout: 8000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2_000_000) {
            req.destroy(new Error("Resource exceeds verification limit."));
          } else chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode || 502,
              headers: {
                "content-type": String(
                  res.headers["content-type"] || "application/octet-stream",
                ),
                ...(res.headers.location
                  ? {
                      location: allowedTarget(
                        new URL(res.headers.location, u).href,
                        origin,
                      ).href,
                    }
                  : {}),
              },
              body: Buffer.concat(chunks),
            });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on("timeout", () =>
      req.destroy(new Error("Verification resource timed out.")),
    );
    req.on("error", reject);
    req.end();
  });
}
