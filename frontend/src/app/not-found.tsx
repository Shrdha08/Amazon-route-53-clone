import { colorBackgroundLayoutMain, colorTextBodyDefault, colorTextBodySecondary, colorTextLinkDefault } from "@cloudscape-design/design-tokens";
import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", padding: "96px 24px", textAlign: "center", background: colorBackgroundLayoutMain, color: colorTextBodyDefault }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Page not found</h1>
      <p style={{ color: colorTextBodySecondary }}>The page you requested does not exist.</p>
      <Link href="/hosted-zones" style={{ color: colorTextLinkDefault }}>Go to hosted zones</Link>
    </div>
  );
}
