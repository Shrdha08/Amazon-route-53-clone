"use client";

import {
  Box,
  Button,
  ColumnLayout,
  Container,
  ContentLayout,
  Header,
  SpaceBetween,
  Spinner,
  Tabs,
  Alert,
} from "@cloudscape-design/components";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useBreadcrumbs } from "@/components/ConsoleShell";
import DeleteZoneModal from "@/components/DeleteZoneModal";
import RecordsTable from "@/components/RecordsTable";
import { useZone } from "@/lib/zones";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Box variant="awsui-key-label">{label}</Box>
      <div>{children}</div>
    </div>
  );
}

export default function HostedZoneDetailPage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const router = useRouter();
  const { data: zone, isLoading, error } = useZone(zoneId);
  const [deleting, setDeleting] = useState(false);
  const displayName = zone?.name.replace(/\.$/, "") ?? zoneId;

  useBreadcrumbs(
    useMemo(
      () => [
        { text: "Route 53", href: "/hosted-zones" },
        { text: "Hosted zones", href: "/hosted-zones" },
        { text: displayName, href: `/hosted-zones/${zoneId}` },
      ],
      [displayName, zoneId],
    ),
  );

  if (isLoading) return <Spinner size="large" />;
  if (error || !zone) {
    return <Alert type="error" header="Hosted zone not found">{(error as Error)?.message ?? "The hosted zone could not be loaded."}</Alert>;
  }

  return (
    <>
      <ContentLayout
        header={
          <Header
            variant="h1"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button onClick={() => router.push(`/hosted-zones/${zone.id}/edit`)}>Edit hosted zone</Button>
                <Button onClick={() => setDeleting(true)}>Delete zone</Button>
              </SpaceBetween>
            }
          >
            {displayName}
          </Header>
        }
      >
        <SpaceBetween size="l">
          <Tabs
            tabs={[
              {
                id: "records",
                label: `Records (${zone.record_count})`,
                content: <RecordsTable zoneId={zone.id} />,
              },
              {
                id: "details",
                label: "Hosted zone details",
                content: (
                  <Container header={<Header variant="h2">Hosted zone details</Header>}>
                    <ColumnLayout columns={3} variant="text-grid">
                      <Field label="Hosted zone name">{displayName}</Field>
                      <Field label="Hosted zone ID">{zone.id}</Field>
                      <Field label="Type">{zone.is_private ? "Private hosted zone" : "Public hosted zone"}</Field>
                      <Field label="Description">{zone.comment || "-"}</Field>
                      <Field label="Record count">{zone.record_count}</Field>
                      <Field label="Created">{new Date(zone.created_at).toLocaleString()}</Field>
                      {zone.is_private && <Field label="Associated VPC">{zone.vpc_id} ({zone.vpc_region})</Field>}
                    </ColumnLayout>
                  </Container>
                ),
              },
              {
                id: "tags",
                label: "Tags",
                content: (
                  <Container header={<Header variant="h2" counter={`(${zone.tags.length})`}>Tags</Header>}>
                    {zone.tags.length === 0 ? (
                      <Box color="text-body-secondary">No tags are associated with this hosted zone.</Box>
                    ) : (
                      <ColumnLayout columns={3} variant="text-grid">
                        {zone.tags.map((t) => (
                          <Field key={t.key} label={t.key}>{t.value || "-"}</Field>
                        ))}
                      </ColumnLayout>
                    )}
                  </Container>
                ),
              },
            ]}
          />
        </SpaceBetween>
      </ContentLayout>
      <DeleteZoneModal zone={deleting ? zone : null} onClose={() => setDeleting(false)} onDeleted={() => router.replace("/hosted-zones")} />
    </>
  );
}
