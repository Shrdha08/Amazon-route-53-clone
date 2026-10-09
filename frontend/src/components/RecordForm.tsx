"use client";

import {
  Alert,
  Box,
  Button,
  Container,
  ContentLayout,
  Form,
  FormField,
  Header,
  Input,
  Select,
  SpaceBetween,
  Textarea,
} from "@cloudscape-design/components";
import { useState } from "react";
import { RECORD_TYPES, type CreatableRecordType, type DnsRecord, type RecordInput } from "@/lib/records";

const TYPE_HINTS: Record<CreatableRecordType, { description: string; placeholder: string }> = {
  A: { description: "Routes traffic to an IPv4 address and some AWS resources", placeholder: "192.0.2.235" },
  AAAA: { description: "Routes traffic to an IPv6 address and some AWS resources", placeholder: "2001:db8::1" },
  CAA: { description: "Restricts CAs that can create SSL/TLS certificates for the domain", placeholder: '0 issue "letsencrypt.org"' },
  CNAME: { description: "Routes traffic to another domain name and to some AWS resources", placeholder: "www.example.com" },
  MX: { description: "Routes traffic to mail servers. Format: priority mailserver", placeholder: "10 mail.example.com" },
  NS: { description: "Identifies the name servers for the hosted zone", placeholder: "ns-1.example.com" },
  PTR: { description: "Maps an IP address to a domain name", placeholder: "www.example.com" },
  SRV: { description: "Application-specific values. Format: priority weight port target", placeholder: "10 5 5060 sip.example.com" },
  TXT: { description: "Used to verify email senders and for application-specific values", placeholder: '"v=spf1 include:example.com ~all"' },
};

/** "www.example.com." in zone "example.com." becomes "www"; the apex becomes "". */
function relativeName(fqdn: string, zoneName: string): string {
  if (fqdn === zoneName) return "";
  return fqdn.endsWith(`.${zoneName}`) ? fqdn.slice(0, -(zoneName.length + 1)) : fqdn;
}

interface Props {
  zoneName: string;
  /** Present when editing: name and type are then read-only. */
  record?: DnsRecord;
  submitting: boolean;
  error: string | null;
  submitLabel: string;
  title: string;
  onSubmit: (input: RecordInput) => void;
  onCancel: () => void;
}

export default function RecordForm({ zoneName, record, submitting, error, submitLabel, title, onSubmit, onCancel }: Props) {
  const zone = zoneName.replace(/\.$/, "");
  const editing = Boolean(record);
  const [name, setName] = useState(record ? relativeName(record.name, zoneName) : "");
  const [type, setType] = useState<CreatableRecordType>((record?.type as CreatableRecordType) ?? "A");
  const [values, setValues] = useState(record ? record.values.join("\n") : "");
  const [ttl, setTtl] = useState(String(record?.ttl ?? 300));
  const [submitted, setSubmitted] = useState(false);

  const valueList = values.split("\n").map((v) => v.trim()).filter(Boolean);
  const valuesError = valueList.length === 0 ? "At least one value is required" : type === "CNAME" && valueList.length > 1 ? "A CNAME record can have only one value" : "";
  const ttlNum = Number(ttl);
  const ttlError = ttl.trim() === "" || !Number.isInteger(ttlNum) || ttlNum < 0 || ttlNum > 2147483647 ? "TTL must be a whole number between 0 and 2147483647" : "";
  const hint = TYPE_HINTS[type];

  return (
    <ContentLayout header={<Header variant="h1">{title}</Header>}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
          if (valuesError || ttlError) return;
          onSubmit({ name: name.trim(), type, ttl: ttlNum, values: valueList });
        }}
      >
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={onCancel}>Cancel</Button>
              <Button variant="primary" formAction="submit" loading={submitting}>{submitLabel}</Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            {error && <Alert type="error" header={editing ? "Could not save record" : "Could not create record"}>{error}</Alert>}
            <Container header={<Header variant="h2">Record details</Header>}>
              <SpaceBetween size="l">
                <FormField
                  label="Record name"
                  description={editing ? undefined : "Leave blank to create a record for the root domain."}
                  constraintText={`Zone: ${zone}. Use * for a wildcard record.`}
                >
                  <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                    <Input value={name} disabled={editing} placeholder="subdomain" onChange={({ detail }) => setName(detail.value)} />
                    <Box color="text-body-secondary">.{zone}</Box>
                  </SpaceBetween>
                </FormField>
                <FormField label="Record type" description={hint.description}>
                  <Select
                    selectedOption={{ value: type, label: type }}
                    disabled={editing}
                    options={RECORD_TYPES.map((t) => ({ value: t, label: t, description: TYPE_HINTS[t].description }))}
                    onChange={({ detail }) => setType(detail.selectedOption.value as CreatableRecordType)}
                  />
                </FormField>
                <FormField
                  label="Value"
                  description="Enter multiple values on separate lines."
                  errorText={submitted ? valuesError : ""}
                >
                  <Textarea value={values} rows={5} placeholder={hint.placeholder} onChange={({ detail }) => setValues(detail.value)} />
                </FormField>
                <FormField label="TTL (seconds)" description="Time to live: how long resolvers cache the record." errorText={submitted ? ttlError : ""}>
                  <Input value={ttl} inputMode="numeric" onChange={({ detail }) => setTtl(detail.value)} />
                </FormField>
                <FormField label="Routing policy">
                  <Input value="Simple routing" disabled onChange={() => undefined} />
                </FormField>
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </Form>
      </form>
    </ContentLayout>
  );
}
