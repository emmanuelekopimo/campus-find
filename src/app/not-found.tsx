import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 20 }}>
      <div>
        <p className="mono dim" style={{ fontSize: 13, letterSpacing: "0.1em" }}>404</p>
        <h1 style={{ fontSize: 34, margin: "8px 0 18px" }}>This post does not exist</h1>
        <Link href="/" className="btn btn-white">Back to feed</Link>
      </div>
    </main>
  );
}
