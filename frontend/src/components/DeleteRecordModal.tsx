"use client";

import { Alert, Box, Button, Modal, SpaceBetween } from "@cloudscape-design/components";
import { useState } from "react";
import { useShell } from "@/components/ConsoleShell";
import { useDeleteRecord, type DnsRecord } from "@/lib/records";

interface Props {
  zoneId: string;
  record: DnsRecord | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteRecordModal(props: Props) {
  // Re-key per record so a previous error does not carry over.
  return <Body key={props.record?.id ?? "none"} {...props} />;
}

function Body({ zoneId, record, onClose, onDeleted }: Props) {
  const { notify } = useShell();
  const remove = useDeleteRecord(zoneId);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!record) return;
    try {
      await remove.mutateAsync(record.id);
      notify("success", `Successfully deleted the ${record.type} record ${record.name.replace(/\.$/, "")}.`);
      onDeleted();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal
      visible={record !== null}
      onDismiss={onClose}
      header="Delete record"
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
        <Box>
          Are you sure you want to delete the <b>{record?.type}</b> record <b>{record?.name.replace(/\.$/, "")}</b>?
        </Box>
      </SpaceBetween>
    </Modal>
  );
}
