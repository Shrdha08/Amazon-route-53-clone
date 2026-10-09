"use client";

import { Box, Button, Modal, SpaceBetween, Table } from "@cloudscape-design/components";

export const SHORTCUTS = [
  { keys: "?", action: "Show keyboard shortcuts" },
  { keys: "/", action: "Focus the table filter" },
  { keys: "g then h", action: "Go to hosted zones" },
  { keys: "g then d", action: "Go to dashboard" },
  { keys: "c", action: "Create a hosted zone (zones list) or a record (zone page)" },
  { keys: "Esc", action: "Close a dialog" },
];

export default function ShortcutsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal
      visible={visible}
      onDismiss={onClose}
      header="Keyboard shortcuts"
      footer={<Box float="right"><Button variant="primary" onClick={onClose}>Close</Button></Box>}
    >
      <SpaceBetween size="s">
        <Table
          variant="embedded"
          items={SHORTCUTS}
          columnDefinitions={[
            { id: "keys", header: "Keys", cell: (s) => <kbd style={{ fontFamily: "monospace" }}>{s.keys}</kbd> },
            { id: "action", header: "Action", cell: (s) => s.action },
          ]}
        />
        <Box variant="small" color="text-body-secondary">Shortcuts are inactive while typing in a field.</Box>
      </SpaceBetween>
    </Modal>
  );
}
