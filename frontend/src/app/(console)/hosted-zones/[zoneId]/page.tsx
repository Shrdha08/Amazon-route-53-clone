"use client";

import {
  Alert,
  Badge,
  Box,
  Button,
  ButtonDropdown,
  ColumnLayout,
  Container,
  ContentLayout,
  ExpandableSection,
  Header,
  Link,
  SpaceBetween,
  Spinner,
  Tabs,
  type TabsProps,
} from "@cloudscape-design/components";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useBreadcrumbs, useShell } from "@/components/ConsoleShell";
import DeleteZoneModal from "@/components/DeleteZoneModal";
import RecordsTable from "@/components/RecordsTable";
import { downloadZoneExport, type ExportFormat } from "@/lib/download";
import { useZone } from "@/lib/zones";

function Field({ label, children }: { label: string; children: ReactNode }) {
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
  const { notify } = useShell();
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

  const tabs: TabsProps.Tab[] = [
    { id: "records", label: `Records (${zone.record_count})`, content: <RecordsTable zoneId={zone.id} /> },
    ...(zone.is_private
      ? []
      : [
          {
            id: "dnssec",
            label: "DNSSEC signing",
            content: (
              <Container header={<Header variant="h2">DNSSEC signing</Header>}>
                <Box color="text-body-secondary">DNSSEC signing is not enabled for this hosted zone. This feature is not available in this clone.</Box>
              </Container>
            ),
          },
        ]),
    {
      id: "tags",
      label: `Hosted zone tags (${zone.tags.length})`,
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
  ];

  return (
    <>
      <ContentLayout
        header={
          <SpaceBetween size="m">
            <Header variant="h1">
              <SpaceBetween direction="horizontal" size="s" alignItems="center">
                <Badge color={zone.is_private ? "grey" : "blue"}>{zone.is_private ? "Private" : "Public"}</Badge>
                <span>{displayName}</span>
                <Link variant="info">Info</Link>
              </SpaceBetween>
            </Header>
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setDeleting(true)}>Delete zone</Button>
              <Button disabled>Test record</Button>
              <Button disabled>Configure query logging</Button>
              <ButtonDropdown
                items={[
                  { id: "bind", text: "BIND zone file", description: "Standard zone file (.zone)" },
                  { id: "json", text: "JSON", description: "Zone details and records (.json)" },
                ]}
                onItemClick={({ detail }) =>
                  downloadZoneExport(zone.id, detail.id as ExportFormat).catch((e: Error) => notify("error", e.message))
                }
              >
                Export zone
              </ButtonDropdown>
            </SpaceBetween>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="l">
          <ExpandableSection
            variant="container"
            headerText="Hosted zone details"
            headerActions={<Button onClick={() => router.push(`/hosted-zones/${zone.id}/edit`)}>Edit hosted zone</Button>}
          >
            <ColumnLayout columns={4} variant="text-grid">
              <Field label="Hosted zone name">{displayName}</Field>
              <Field label="Hosted zone ID">{zone.id}</Field>
              <Field label="Description">{zone.comment || "-"}</Field>
              <Field label="Type">{zone.is_private ? "Private hosted zone" : "Public hosted zone"}</Field>
              <Field label="Record count">{zone.record_count}</Field>
              {zone.is_private && <Field label="Associated VPC">{zone.vpc_id} ({zone.vpc_region})</Field>}
              <Field label="Created">{new Date(zone.created_at).toLocaleString()}</Field>
            </ColumnLayout>
          </ExpandableSection>
          <Tabs tabs={tabs} />
        </SpaceBetween>
      </ContentLayout>
      <DeleteZoneModal zone={deleting ? zone : null} onClose={() => setDeleting(false)} onDeleted={() => router.replace("/hosted-zones")} />
    </>
  );
}
