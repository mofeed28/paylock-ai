"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page">
      <div className="card empty">
        <h1>We couldn’t load this view.</h1>
        <p>
          Your saved work remains in the database. Confirm migrations have run,
          then try again.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
