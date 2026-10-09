"use client";

import { Alert, Spinner } from "@cloudscape-design/components";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useBreadcrumbs, useShell } from "@/components/ConsoleShell";
import RecordForm from "@/components/RecordForm";
import { useRecord, useUpdateRecord } from "@/lib/records";
import { useZone } from "@/lib/zones";

export default function EditRecordPage() {
  const { zoneId, recordId } = useParams<{ zoneId: string; recordId: string }>();
  const id = Number(recordId);
  const router = useRouter();
  const { notify } = useShell();
  const zoneQuery = useZone(zoneId);
  const recordQuery = useRecord(zoneId, id);
  const update = useUpdateRecord(zoneId, id);
  const [serverError, setServerError] = useState<string | null>(null);
  const zone = zoneQuery.data;
  const record = recordQuery.data;
  const displayName = zone?.name.replace(/\.$/, "") ?? zoneId;

  useBreadcrumbs(
    useMemo(
      () => [
        { text: "Route 53", href: "/hosted-zones" },
        { text: "Hosted zones", href: "/hosted-zones" },
        { text: displayName, href: `/hosted-zones/${zoneId}` },
        { text: "Edit record", href: `/hosted-zones/${zoneId}/records/${recordId}/edit` },
      ],
      [displayName, zoneId, recordId],
    ),
  );

  if (zoneQuery.isLoading || recordQuery.isLoading) return <Spinner size="large" />;
  if (!zone || !record) {
    return <Alert type="error" header="Record not found">{((zoneQuery.error ?? recordQuery.error) as Error | null)?.message}</Alert>;
  }

  return (
    <RecordForm
      title="Edit record"
      submitLabel="Save changes"
      zoneName={zone.name}
      record={record}
      submitting={update.isPending}
      error={serverError}
      onCancel={() => router.push(`/hosted-zones/${zoneId}`)}
      onSubmit={async ({ ttl, values }) => {
        setServerError(null);
        try {
          await update.mutateAsync({ ttl, values });
          notify("success", `Record ${record.name.replace(/\.$/, "")} (${record.type}) was successfully updated.`);
          router.push(`/hosted-zones/${zoneId}`);
        } catch (e) {
          setServerError((e as Error).message);
        }
      }}
    />
  );
}
