import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page">
      <div className="card empty">
        <h1>This page isn’t here.</h1>
        <p>The agreement or seller link may be incorrect.</p>
        <Link className="text-link" href="/">
          Return to your workspace →
        </Link>
      </div>
    </div>
  );
}
