"use client";

import { Alert, Spinner } from "@cloudscape-design/components";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useBreadcrumbs, useShell } from "@/components/ConsoleShell";
import RecordForm from "@/components/RecordForm";
import { useCreateRecord, type DnsRecord } from "@/lib/records";
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

  const label = (r: DnsRecord) => r.name.replace(/\.$/, "");

  return (
    <RecordForm
      title="Create record"
      submitLabel="Create records"
      zoneName={zone.name}
      submitting={create.isPending}
      error={serverError}
      onCancel={() => router.push(`/hosted-zones/${zoneId}`)}
      onSubmit={async (inputs) => {
        setServerError(null);
        // Create in order; stop at the first failure so the remaining records stay in the form.
        const created: DnsRecord[] = [];
        for (const [i, input] of inputs.entries()) {
          try {
            created.push(await create.mutateAsync(input));
          } catch (e) {
            setServerError(`Record ${i + 1} (${input.name || "root domain"} ${input.type}): ${(e as Error).message}`);
            break;
          }
        }
        if (created.length > 0) {
          notify(
            "success",
            created.length === 1
              ? `Record for ${label(created[0])} was successfully created.`
              : `${created.length} records were successfully created: ${created.map(label).join(", ")}.`,
          );
        }
        if (created.length === inputs.length) router.push(`/hosted-zones/${zoneId}`);
        return created.length;
      }}
    />
  );
}
