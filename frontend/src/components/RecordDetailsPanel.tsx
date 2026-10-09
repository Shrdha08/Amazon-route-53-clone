"use client";

import { Box, Button, ColumnLayout, HelpPanel, SpaceBetween } from "@cloudscape-design/components";
import type { DnsRecord } from "@/lib/records";

const SHOWN = 8;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Box variant="awsui-key-label">{label}</Box>
      <div style={{ wordBreak: "break-all", whiteSpace: "pre-line" }}>{children}</div>
    </div>
  );
}

/** Right-hand panel showing the selected record(s), like the console's records side panel. */
export default function RecordDetailsPanel({ records, onEdit }: { records: DnsRecord[]; onEdit: (record: DnsRecord) => void }) {
  const count = records.length;
  const record = count === 1 ? records[0] : undefined;
  return (
    <HelpPanel header={<h2>{count} record{count === 1 ? "" : "s"} selected</h2>}>
      {count === 0 && <Box color="text-body-secondary">Select a record to see its details</Box>}
      {record && (
        <SpaceBetween size="m">
          <Button onClick={() => onEdit(record)}>Edit record</Button>
          <ColumnLayout columns={1}>
            <Field label="Record name">{record.name.replace(/\.$/, "")}</Field>
            <Field label="Record type">{record.type}</Field>
            <Field label="Value/Route traffic to">{record.values.join("\n")}</Field>
            <Field label="TTL (seconds)">{record.ttl}</Field>
            <Field label="Routing policy">{record.routing_policy}</Field>
            <Field label="Alias">No</Field>
          </ColumnLayout>
        </SpaceBetween>
      )}
      {count > 1 && (
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {records.slice(0, SHOWN).map((r) => (
            <li key={r.id}>{r.name.replace(/\.$/, "")} ({r.type})</li>
          ))}
          {count > SHOWN && <li>and {count - SHOWN} more</li>}
        </ul>
      )}
    </HelpPanel>
  );
}
