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
  RadioGroup,
  Select,
  SpaceBetween,
  Textarea,
} from "@cloudscape-design/components";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useBreadcrumbs, useShell } from "@/components/ConsoleShell";
import { useCreateZone, type Tag } from "@/lib/zones";

const REGIONS = ["us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-south-1", "ap-southeast-1"];
const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+\.?$/i;
const MAX_TAGS = 50;

export default function CreateHostedZonePage() {
  const router = useRouter();
  const { notify } = useShell();
  const create = useCreateZone();
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const [region, setRegion] = useState("us-east-1");
  const [vpcId, setVpcId] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useBreadcrumbs(
    useMemo(
      () => [
        { text: "Route 53", href: "/hosted-zones" },
        { text: "Hosted zones", href: "/hosted-zones" },
        { text: "Create hosted zone", href: "/hosted-zones/create" },
      ],
      [],
    ),
  );

  const nameError = !name.trim() ? "Domain name is required" : !DOMAIN_RE.test(name.trim()) ? "Domain name is not valid, e.g. example.com" : "";
  const vpcError = type === "private" && !vpcId.trim() ? "VPC ID is required for a private hosted zone" : "";
  const tagKeyError = (t: Tag) => (!t.key.trim() ? "Key is required" : tags.filter((x) => x.key === t.key).length > 1 ? "Keys must be unique" : "");
  const invalid = Boolean(nameError || vpcError || tags.some(tagKeyError));

  async function onSubmit() {
    setSubmitted(true);
    setServerError(null);
    if (invalid) return;
    try {
      const zone = await create.mutateAsync({
        name: name.trim(),
        comment,
        is_private: type === "private",
        vpc_region: type === "private" ? region : null,
        vpc_id: type === "private" ? vpcId.trim() : null,
        tags,
      });
      notify("success", `Successfully created hosted zone ${zone.name.replace(/\.$/, "")}.`);
      router.push(`/hosted-zones/${zone.id}`);
    } catch (e) {
      setServerError((e as Error).message);
    }
  }

  return (
    <ContentLayout header={<Header variant="h1" description="Specify the domain name and settings for the DNS records that you want to manage.">Create hosted zone</Header>}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" formAction="none" onClick={() => router.push("/hosted-zones")}>Cancel</Button>
              <Button variant="primary" formAction="submit" loading={create.isPending}>Create hosted zone</Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            {serverError && <Alert type="error" header="Could not create hosted zone">{serverError}</Alert>}
            <Container header={<Header variant="h2">Hosted zone configuration</Header>}>
              <SpaceBetween size="l">
                <FormField
                  label="Domain name"
                  description="This is the name of the domain that you want to route traffic for."
                  constraintText="Valid characters: a-z, 0-9, and - (hyphen)."
                  errorText={submitted ? nameError : ""}
                >
                  <Input value={name} placeholder="example.com" onChange={({ detail }) => setName(detail.value)} />
                </FormField>
                <FormField label={<>Description <i>- optional</i></>} description="This value lets you distinguish hosted zones that have the same name." constraintText="The description can have up to 256 characters.">
                  <Textarea value={comment} rows={3} onChange={({ detail }) => setComment(detail.value.slice(0, 256))} />
                </FormField>
                <FormField label="Type" description="The type indicates whether you want to route traffic on the internet or in an Amazon VPC.">
                  <RadioGroup
                    value={type}
                    onChange={({ detail }) => setType(detail.value as "public" | "private")}
                    items={[
                      { value: "public", label: "Public hosted zone", description: "A public hosted zone determines how traffic is routed on the internet." },
                      { value: "private", label: "Private hosted zone", description: "A private hosted zone determines how traffic is routed within an Amazon VPC." },
                    ]}
                  />
                </FormField>
              </SpaceBetween>
            </Container>

            {type === "private" && (
              <Container header={<Header variant="h2">VPCs to associate with the hosted zone</Header>}>
                <SpaceBetween size="l">
                  <FormField label="Region">
                    <Select
                      selectedOption={{ value: region, label: region }}
                      options={REGIONS.map((r) => ({ value: r, label: r }))}
                      onChange={({ detail }) => setRegion(detail.selectedOption.value ?? region)}
                    />
                  </FormField>
                  <FormField label="VPC ID" errorText={submitted ? vpcError : ""}>
                    <Input value={vpcId} placeholder="vpc-0123456789abcdef0" onChange={({ detail }) => setVpcId(detail.value)} />
                  </FormField>
                </SpaceBetween>
              </Container>
            )}

            <Container header={<Header variant="h2">Tags</Header>}>
              <SpaceBetween size="s">
                <Box color="text-body-secondary">A tag is a label that you assign to an AWS resource. Each tag consists of a key and an optional value.</Box>
                {tags.map((t, i) => (
                  <SpaceBetween key={i} direction="horizontal" size="xs" alignItems="end">
                    <FormField label={i === 0 ? "Key" : undefined} errorText={submitted ? tagKeyError(t) : ""}>
                      <Input value={t.key} placeholder="Enter key" onChange={({ detail }) => setTags(tags.map((x, j) => (j === i ? { ...x, key: detail.value } : x)))} />
                    </FormField>
                    <FormField label={i === 0 ? <>Value <i>- optional</i></> : undefined}>
                      <Input value={t.value} placeholder="Enter value" onChange={({ detail }) => setTags(tags.map((x, j) => (j === i ? { ...x, value: detail.value } : x)))} />
                    </FormField>
                    <Button formAction="none" onClick={() => setTags(tags.filter((_, j) => j !== i))}>Remove</Button>
                  </SpaceBetween>
                ))}
                <Button formAction="none" disabled={tags.length >= MAX_TAGS} onClick={() => setTags([...tags, { key: "", value: "" }])}>Add tag</Button>
                <Box variant="small" color="text-body-secondary">You can add up to {MAX_TAGS - tags.length} more tags.</Box>
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </Form>
      </form>
    </ContentLayout>
  );
}
