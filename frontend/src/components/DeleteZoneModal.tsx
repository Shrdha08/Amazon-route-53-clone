"use client";

import { Alert, Box, Button, FormField, Input, Modal, SpaceBetween } from "@cloudscape-design/components";
import { useState } from "react";
import { useShell } from "@/components/ConsoleShell";
import { useDeleteZone, type HostedZone } from "@/lib/zones";

interface Props {
  zone: HostedZone | null;
  onClose: () => void;
  onDeleted: () => void;
}

/** Route 53 asks the user to type "delete" before a hosted zone is removed. */
export default function DeleteZoneModal(props: Props) {
  // Re-key on the zone so the confirmation text and error reset for each zone.
  return <DeleteZoneModalBody key={props.zone?.id ?? "none"} {...props} />;
}

function DeleteZoneModalBody({ zone, onClose, onDeleted }: Props) {
  const { notify } = useShell();
  const remove = useDeleteZone();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!zone) return;
    try {
      await remove.mutateAsync(zone.id);
      notify("success", `Successfully deleted hosted zone ${zone.name.replace(/\.$/, "")}.`);
      onDeleted();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal
      visible={zone !== null}
      onDismiss={onClose}
      header="Delete hosted zone?"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onClose}>Cancel</Button>
            <Button variant="primary" disabled={confirm !== "delete"} loading={remove.isPending} onClick={onDelete}>
              Delete
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {error && <Alert type="error">{error}</Alert>}
        <Box>
          Delete <b>hosted zone</b> <i>{zone?.name.replace(/\.$/, "")}</i> permanently? This action cannot be undone.
        </Box>
        <hr style={{ border: 0, borderTop: "1px solid #e9ebed", margin: 0 }} />
        <FormField label={<span style={{ fontWeight: 400 }}>To confirm deletion, enter <i>delete</i> in the text input field.</span>}>
          <Input value={confirm} placeholder="delete" ariaLabel="Confirm deletion" onChange={({ detail }) => setConfirm(detail.value)} />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}
