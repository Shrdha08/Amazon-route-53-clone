"use client";

import {
  Alert,
  Button,
  Container,
  ContentLayout,
  Form,
  FormField,
  Header,
  SpaceBetween,
  Spinner,
  Textarea,
} from "@cloudscape-design/components";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useBreadcrumbs, useShell } from "@/components/ConsoleShell";
import { useUpdateZone, useZone } from "@/lib/zones";

export default function EditHostedZonePage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const router = useRouter();
  const { notify } = useShell();
  const { data: zone, isLoading, error } = useZone(zoneId);
  const update = useUpdateZone(zoneId);
  const [draft, setDraft] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const displayName = zone?.name.replace(/\.$/, "") ?? zoneId;

  const comment = draft ?? zone?.comment ?? "";
  const setComment = setDraft;

  useBreadcrumbs(
    useMemo(
      () => [
        { text: "Route 53", href: "/hosted-zones" },
        { text: "Hosted zones", href: "/hosted-zones" },
        { text: displayName, href: `/hosted-zones/${zoneId}` },
        { text: "Edit hosted zone", href: `/hosted-zones/${zoneId}/edit` },
      ],
      [displayName, zoneId],
    ),
  );

  if (isLoading) return <Spinner size="large" />;
  if (error || !zone) {
    return <Alert type="error" header="Hosted zone not found">{(error as Error)?.message ?? "The hosted zone could not be loaded."}</Alert>;
  }

  async function onSave() {
    setServerError(null);
    try {
      await update.mutateAsync(comment);
      notify("success", `Successfully updated hosted zone ${displayName}.`);
      router.push(`/hosted-zones/${zoneId}`);
    } catch (e) {
      setServerError((e as Error).message);
    }
  }

  return (
    <ContentLayout header={<Header variant="h1">Edit hosted zone</Header>}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => router.push(`/hosted-zones/${zoneId}`)}>Cancel</Button>
              <Button variant="primary" formAction="submit" loading={update.isPending}>Save changes</Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            {serverError && <Alert type="error">{serverError}</Alert>}
            <Container header={<Header variant="h2">Hosted zone configuration</Header>}>
              <FormField label="Description" description="Only the description of a hosted zone can be changed." constraintText="The description can have up to 256 characters.">
                <Textarea value={comment} rows={3} onChange={({ detail }) => setComment(detail.value.slice(0, 256))} />
              </FormField>
            </Container>
          </SpaceBetween>
        </Form>
      </form>
    </ContentLayout>
  );
}
