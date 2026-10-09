"use client";

import { Alert, Box, Button, Modal, SpaceBetween } from "@cloudscape-design/components";
import { useState } from "react";
import { useShell } from "@/components/ConsoleShell";
import { useDeleteRecords, type DnsRecord } from "@/lib/records";

interface Props {
  zoneId: string;
  records: DnsRecord[];
  onClose: () => void;
  onDeleted: () => void;
}

const SHOWN = 8;
const display = (r: DnsRecord) => `${r.name.replace(/\.$/, "")} (${r.type})`;

export default function DeleteRecordModal(props: Props) {
  // Re-key per selection so a previous error does not carry over.
  return <Body key={props.records.map((r) => r.id).join(",") || "none"} {...props} />;
}

function Body({ zoneId, records, onClose, onDeleted }: Props) {
  const { notify } = useShell();
  const remove = useDeleteRecords(zoneId);
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(records.map((r) => [r.id, r]));

  async function onDelete() {
    try {
      const { deleted, failed } = await remove.mutateAsync(records.map((r) => r.id));
      if (deleted.length > 0) {
        notify("success", deleted.length === 1 && records.length === 1
          ? `Successfully deleted the ${records[0].type} record ${records[0].name.replace(/\.$/, "")}.`
          : `Successfully deleted ${deleted.length} record${deleted.length === 1 ? "" : "s"}.`);
      }
      if (failed.length > 0) {
        notify("error", `Could not delete ${failed.length} record${failed.length === 1 ? "" : "s"}: ${failed
          .map((f) => `${byId.has(f.id) ? display(byId.get(f.id)!) : f.id} - ${f.reason}`)
          .join("; ")}`);
      }
      onDeleted();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const count = records.length;
  return (
    <Modal
      visible={count > 0}
      onDismiss={onClose}
      header={count > 1 ? `Delete ${count} records` : "Delete record"}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onClose}>Cancel</Button>
            <Button variant="primary" loading={remove.isPending} onClick={onDelete}>Delete</Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {error && <Alert type="error">{error}</Alert>}
        {count === 1 ? (
          <Box>Are you sure you want to delete the <b>{records[0].type}</b> record <b>{records[0].name.replace(/\.$/, "")}</b>?</Box>
        ) : (
          <>
            <Box>Are you sure you want to delete these {count} records?</Box>
            <ul style={{ margin: 0 }}>
              {records.slice(0, SHOWN).map((r) => <li key={r.id}>{display(r)}</li>)}
              {count > SHOWN && <li>and {count - SHOWN} more</li>}
            </ul>
          </>
        )}
      </SpaceBetween>
    </Modal>
  );
}
