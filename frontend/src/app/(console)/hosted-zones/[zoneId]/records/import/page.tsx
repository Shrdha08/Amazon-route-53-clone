"use client";

import {
  Alert,
  Box,
  Button,
  Container,
  ContentLayout,
  Form,
  FormField,
  FileUpload,
  Header,
  SpaceBetween,
  Spinner,
  Textarea,
} from "@cloudscape-design/components";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useBreadcrumbs } from "@/components/ConsoleShell";
import { useImportRecords, type ImportIssue, type ImportResult } from "@/lib/records";
import { useZone } from "@/lib/zones";

const MAX_BYTES = 1_000_000;
const PLACEHOLDER = `$ORIGIN example.com.
$TTL 300
www    IN A      192.0.2.10
@      IN MX     10 mail
mail   IN A      192.0.2.20
@      IN TXT    "v=spf1 -all"`;

function IssueList({ issues }: { issues: ImportIssue[] }) {
  return (
    <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
      {issues.map((i, idx) => (
        <li key={idx}>
          {i.line != null && <>Line {i.line}: </>}
          {i.name && <b>{i.name} {i.type} </b>}
          {i.message}
        </li>
      ))}
    </ul>
  );
}

export default function ImportRecordsPage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const router = useRouter();
  const { data: zone, isLoading, error } = useZone(zoneId);
  const importRecords = useImportRecords(zoneId);
  const [files, setFiles] = useState<File[]>([]);
  const [content, setContent] = useState("");
  const [fileError, setFileError] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const displayName = zone?.name.replace(/\.$/, "") ?? zoneId;

  useBreadcrumbs(
    useMemo(
      () => [
        { text: "Route 53", href: "/hosted-zones" },
        { text: "Hosted zones", href: "/hosted-zones" },
        { text: displayName, href: `/hosted-zones/${zoneId}` },
        { text: "Import zone file", href: `/hosted-zones/${zoneId}/records/import` },
      ],
      [displayName, zoneId],
    ),
  );

  if (isLoading) return <Spinner size="large" />;
  if (error || !zone) return <Alert type="error" header="Hosted zone not found">{(error as Error)?.message}</Alert>;

  async function onFile(next: File[]) {
    setFiles(next);
    setFileError("");
    const file = next[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setFileError("The file is larger than 1 MB.");
      setFiles([]);
      return;
    }
    setContent(await file.text());
  }

  async function onImport() {
    setServerError(null);
    setResult(null);
    try {
      setResult(await importRecords.mutateAsync(content));
    } catch (e) {
      setServerError((e as Error).message);
    }
  }

  return (
    <ContentLayout
      header={
        <Header variant="h1" description={`Import DNS records from a BIND zone file into ${displayName}. Existing records are not changed.`}>
          Import zone file
        </Header>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); onImport(); }}>
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" formAction="none" onClick={() => router.push(`/hosted-zones/${zoneId}`)}>
                {result ? "Back to hosted zone" : "Cancel"}
              </Button>
              <Button variant="primary" formAction="submit" loading={importRecords.isPending} disabled={!content.trim()}>Import</Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            {serverError && <Alert type="error" header="Could not import zone file">{serverError}</Alert>}
            {result && (
              <SpaceBetween size="s">
                <Alert type={result.created > 0 && result.errors.length === 0 ? "success" : result.created > 0 ? "warning" : "info"} header={`${result.created} record${result.created === 1 ? "" : "s"} imported`}>
                  {result.skipped.length} skipped, {result.errors.length} with errors.
                </Alert>
                {result.skipped.length > 0 && (
                  <Alert type="info" header="Skipped">
                    <IssueList issues={result.skipped} />
                  </Alert>
                )}
                {result.errors.length > 0 && (
                  <Alert type="error" header="Errors">
                    <IssueList issues={result.errors} />
                  </Alert>
                )}
              </SpaceBetween>
            )}
            <Container header={<Header variant="h2">Zone file</Header>}>
              <SpaceBetween size="l">
                <FormField label="Upload a zone file" description="Choose a BIND-format file (up to 1 MB), or paste its contents below." errorText={fileError}>
                  <FileUpload
                    value={files}
                    onChange={({ detail }) => onFile(detail.value)}
                    accept=".zone,.txt,.db,text/plain"
                    i18nStrings={{
                      uploadButtonText: () => "Choose file",
                      dropzoneText: () => "Drop file to upload",
                      removeFileAriaLabel: (i) => `Remove file ${i + 1}`,
                      limitShowFewer: "Show fewer files",
                      limitShowMore: "Show more files",
                      errorIconAriaLabel: "Error",
                    }}
                  />
                </FormField>
                <FormField label="Zone file contents" constraintText="Supported: A, AAAA, CAA, CNAME, MX, NS, PTR, SRV and TXT. SOA and the apex NS records already exist and are skipped.">
                  <Textarea value={content} rows={14} placeholder={PLACEHOLDER} onChange={({ detail }) => setContent(detail.value)} />
                </FormField>
                <Box variant="small" color="text-body-secondary">Relative names are resolved against {zone.name}.</Box>
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </Form>
      </form>
    </ContentLayout>
  );
}
