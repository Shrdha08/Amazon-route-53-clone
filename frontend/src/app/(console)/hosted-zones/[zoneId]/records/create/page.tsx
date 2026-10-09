"use client";

import { Alert, Spinner } from "@cloudscape-design/components";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useBreadcrumbs, useShell } from "@/components/ConsoleShell";
import RecordForm from "@/components/RecordForm";
import { useCreateRecord } from "@/lib/records";
import { useZone } from "@/lib/zones";

export default function CreateRecordPage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const router = useRouter();
  const { notify } = useShell();
  const { data: zone, isLoading, error } = useZone(zoneId);
  const create = useCreateRecord(zoneId);
  const [serverError, setServerError] = useState<string | null>(null);
  const displayName = zone?.name.replace(/\.$/, "") ?? zoneId;

  useBreadcrumbs(
    useMemo(
      () => [
        { text: "Route 53", href: "/hosted-zones" },
        { text: "Hosted zones", href: "/hosted-zones" },
        { text: displayName, href: `/hosted-zones/${zoneId}` },
        { text: "Create record", href: `/hosted-zones/${zoneId}/records/create` },
      ],
      [displayName, zoneId],
    ),
  );

  if (isLoading) return <Spinner size="large" />;
  if (error || !zone) return <Alert type="error" header="Hosted zone not found">{(error as Error)?.message}</Alert>;

  return (
    <RecordForm
      title="Create record"
      submitLabel="Create records"
      zoneName={zone.name}
      submitting={create.isPending}
      error={serverError}
      onCancel={() => router.push(`/hosted-zones/${zoneId}`)}
      onSubmit={async (input) => {
        setServerError(null);
        try {
          const rec = await create.mutateAsync(input);
          notify("success", `Record ${rec.name.replace(/\.$/, "")} (${rec.type}) was successfully created.`);
          router.push(`/hosted-zones/${zoneId}`);
        } catch (e) {
          setServerError((e as Error).message);
        }
      }}
    />
  );
}
