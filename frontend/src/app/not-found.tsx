import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ padding: "96px 24px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Page not found</h1>
      <p style={{ color: "#5f6b7a" }}>The page you requested does not exist.</p>
      <Link href="/hosted-zones" style={{ color: "#0972d3" }}>Go to hosted zones</Link>
    </div>
  );
}
