export type ExportFormat = "bind" | "json";

/** Fetch a zone export and hand it to the browser as a file download. */
export async function downloadZoneExport(zoneId: string, format: ExportFormat): Promise<void> {
  const res = await fetch(`/api/hosted-zones/${zoneId}/export?format=${format}`, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const filename = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `${zoneId}.${format}`;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
