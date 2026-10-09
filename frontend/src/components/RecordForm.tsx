"use client";

import {
  Alert,
  Box,
  Button,
  Container,
  ContentLayout,
  ExpandableSection,
  Form,
  FormField,
  Grid,
  Header,
  Input,
  Link,
  Select,
  SpaceBetween,
  Textarea,
  Toggle,
  type SelectProps,
} from "@cloudscape-design/components";
import { useState } from "react";
import { useShell } from "@/components/ConsoleShell";
import type { CreatableRecordType, DnsRecord, RecordInput } from "@/lib/records";

/** Record types in the console's order and wording; unsupported ones are listed but disabled. */
const TYPE_OPTIONS: { value: string; description: string; placeholder?: string; supported: boolean }[] = [
  { value: "A", description: "Routes traffic to an IPv4 address and some AWS resources", placeholder: "192.0.2.235", supported: true },
  { value: "AAAA", description: "Routes traffic to an IPv6 address and some AWS resources", placeholder: "2001:0db8:85a3:0:0:8a2e:0370:7334", supported: true },
  { value: "CNAME", description: "Routes traffic to another domain name and to some AWS resources", placeholder: "www.example.com", supported: true },
  { value: "MX", description: "Specifies mail servers", placeholder: "10 mailserver.example.com", supported: true },
  { value: "TXT", description: "Used to verify email senders and for application-specific values", placeholder: '"Sample Text Entries"', supported: true },
  { value: "PTR", description: "Maps an IP address to a domain name", placeholder: "www.example.com", supported: true },
  { value: "SRV", description: "Application-specific values that identify servers", placeholder: "1 10 5269 xmpp-server.example.com", supported: true },
  { value: "SPF", description: "Not recommended", supported: false },
  { value: "NAPTR", description: "Used by Dynamic Delegation Discovery System applications", supported: false },
  { value: "CAA", description: "Restricts CAs that can create SSL/TLS certificates for the domain", placeholder: '0 issue "caname.com"', supported: true },
  { value: "NS", description: "Name servers for a hosted zone", placeholder: "ns-1.example.com", supported: true },
];

const ROUTING_OPTIONS: SelectProps.Option[] = [
  { value: "Simple", label: "Simple routing" },
  ...["Weighted", "Geolocation", "Latency", "Failover", "Multivalue answer", "IP-based", "Geoproximity"].map((p) => ({
    value: p,
    label: p,
    description: "Not available in this clone",
    disabled: true,
  })),
];

const TTL_PRESETS = [
  { label: "1m", seconds: 60 },
  { label: "1h", seconds: 3600 },
  { label: "1d", seconds: 86400 },
];

const typeLabel = (t: string) => `${t} – ${TYPE_OPTIONS.find((o) => o.value === t)?.description ?? ""}`;

interface Draft {
  key: number;
  name: string;
  type: CreatableRecordType;
  values: string;
  ttl: string;
}

/** "www.example.com." in zone "example.com." becomes "www"; the apex becomes "". */
function relativeName(fqdn: string, zoneName: string): string {
  if (fqdn === zoneName) return "";
  return fqdn.endsWith(`.${zoneName}`) ? fqdn.slice(0, -(zoneName.length + 1)) : fqdn;
}

function draftErrors(d: Draft) {
  const values = d.values.split("\n").map((v) => v.trim()).filter(Boolean);
  const ttl = Number(d.ttl);
  return {
    values: values.length === 0 ? "Enter at least one value" : d.type === "CNAME" && values.length > 1 ? "A CNAME record can have only one value" : "",
    ttl: d.ttl.trim() === "" || !Number.isInteger(ttl) || ttl < 0 || ttl > 2147483647 ? "TTL must be a whole number between 0 and 2147483647" : "",
  };
}

function toInput(d: Draft): RecordInput {
  return { name: d.name.trim(), type: d.type, ttl: Number(d.ttl), values: d.values.split("\n").map((v) => v.trim()).filter(Boolean) };
}

const InfoLink = () => <Link variant="info">Info</Link>;

interface Props {
  zoneName: string;
  /** Present when editing: a single record whose name and type are read-only. */
  record?: DnsRecord;
  submitting: boolean;
  error: string | null;
  submitLabel: string;
  title: string;
  /** Resolves to how many of the inputs (in order) were saved; those are removed from the form. */
  onSubmit: (inputs: RecordInput[]) => Promise<number>;
  onCancel: () => void;
}

export default function RecordForm({ zoneName, record, submitting, error, submitLabel, title, onSubmit, onCancel }: Props) {
  const { notify } = useShell();
  const zone = zoneName.replace(/\.$/, "");
  const editing = Boolean(record);
  const [nextKey, setNextKey] = useState(2);
  const [drafts, setDrafts] = useState<Draft[]>([
    {
      key: 1,
      name: record ? relativeName(record.name, zoneName) : "",
      type: (record?.type as CreatableRecordType) ?? "A",
      values: record ? record.values.join("\n") : "",
      ttl: String(record?.ttl ?? 300),
    },
  ]);
  const [submitted, setSubmitted] = useState(false);

  const update = (key: number, patch: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  function addRecord() {
    setDrafts((ds) => [...ds, { key: nextKey, name: "", type: "A", values: "", ttl: "300" }]);
    setNextKey((k) => k + 1);
  }

  async function submit() {
    setSubmitted(true);
    if (drafts.some((d) => Object.values(draftErrors(d)).some(Boolean))) return;
    const saved = await onSubmit(drafts.map(toInput));
    // In create mode, drop the records that were saved so only the failing ones remain.
    if (!editing && saved > 0 && saved < drafts.length) setDrafts((ds) => ds.slice(saved));
  }

  function fields(d: Draft) {
    const errors = draftErrors(d);
    const placeholder = TYPE_OPTIONS.find((o) => o.value === d.type)?.placeholder;
    return (
      <SpaceBetween size="l">
        <Grid gridDefinition={[{ colspan: { default: 12, s: 6 } }, { colspan: { default: 12, s: 6 } }]}>
          <FormField label="Record name" info={<InfoLink />} constraintText={editing ? undefined : "Keep blank to create a record for the root domain."}>
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <Input value={d.name} disabled={editing} placeholder="subdomain" ariaLabel="Record name" onChange={({ detail }) => update(d.key, { name: detail.value })} />
              <Box>.{zone}</Box>
            </SpaceBetween>
          </FormField>
          <FormField label="Record type" info={<InfoLink />}>
            <Select
              selectedOption={{ value: d.type, label: typeLabel(d.type) }}
              disabled={editing}
              ariaLabel="Record type"
              options={TYPE_OPTIONS.map((o) => ({
                value: o.value,
                label: typeLabel(o.value),
                // Each zone already has its apex NS record set.
                disabled: !o.supported || (o.value === "NS" && d.name.trim() === ""),
              }))}
              onChange={({ detail }) => update(d.key, { type: detail.selectedOption.value as CreatableRecordType })}
            />
          </FormField>
        </Grid>
        <Toggle checked={false} disabled>Alias</Toggle>
        <FormField
          label="Value"
          info={<InfoLink />}
          constraintText="Enter multiple values on separate lines."
          errorText={submitted ? errors.values : ""}
          stretch
        >
          <Textarea value={d.values} rows={3} placeholder={placeholder} onChange={({ detail }) => update(d.key, { values: detail.value })} />
        </FormField>
        <Grid gridDefinition={[{ colspan: { default: 12, s: 6 } }, { colspan: { default: 12, s: 6 } }]}>
          <FormField
            label="TTL (seconds)"
            info={<InfoLink />}
            constraintText="Recommended values: 60 to 172800 (two days)"
            errorText={submitted ? errors.ttl : ""}
          >
            <SpaceBetween direction="horizontal" size="xs">
              <Input value={d.ttl} type="number" inputMode="numeric" ariaLabel="TTL (seconds)" onChange={({ detail }) => update(d.key, { ttl: detail.value })} />
              {TTL_PRESETS.map((p) => (
                <Button key={p.label} formAction="none" onClick={() => update(d.key, { ttl: String(p.seconds) })}>
                  {p.label}
                </Button>
              ))}
            </SpaceBetween>
          </FormField>
          <FormField label="Routing policy" info={<InfoLink />}>
            <Select selectedOption={ROUTING_OPTIONS[0]} options={ROUTING_OPTIONS} ariaLabel="Routing policy" onChange={() => undefined} />
          </FormField>
        </Grid>
      </SpaceBetween>
    );
  }

  return (
    <ContentLayout header={<Header variant="h1" info={<InfoLink />}>{title}</Header>}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" formAction="none" onClick={onCancel}>Cancel</Button>
              <Button variant="primary" formAction="submit" loading={submitting}>{submitLabel}</Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            {error && <Alert type="error" header={editing ? "Could not save record" : "Could not create records"}>{error}</Alert>}
            <Container
              header={
                <Header
                  variant="h2"
                  actions={
                    editing ? undefined : (
                      <Link onFollow={() => notify("info", "The record wizard is not available in this clone. Use quick create to add records.")}>
                        Switch to wizard
                      </Link>
                    )
                  }
                >
                  {editing ? "Edit record" : "Quick create record"}
                </Header>
              }
              footer={
                editing ? undefined : (
                  <Box float="right">
                    <Button formAction="none" onClick={addRecord}>Add another record</Button>
                  </Box>
                )
              }
            >
              {editing ? (
                fields(drafts[0])
              ) : (
                <SpaceBetween size="l">
                  {drafts.map((d, i) => (
                    <ExpandableSection
                      key={d.key}
                      defaultExpanded
                      headerText={`Record ${i + 1}`}
                      headerActions={
                        <Button formAction="none" disabled={drafts.length === 1} onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}>
                          Delete
                        </Button>
                      }
                    >
                      {fields(d)}
                    </ExpandableSection>
                  ))}
                </SpaceBetween>
              )}
            </Container>
          </SpaceBetween>
        </Form>
      </form>
    </ContentLayout>
  );
}
