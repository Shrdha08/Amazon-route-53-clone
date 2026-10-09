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
  Link,
  Select,
  SpaceBetween,
  Textarea,
  Tiles,
} from "@cloudscape-design/components";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useBreadcrumbs, useShell } from "@/components/ConsoleShell";
import { REGIONS } from "@/lib/regions";
import { useCreateZone, type Tag } from "@/lib/zones";

const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+\.?$/i;
const MAX_TAGS = 50;
const MAX_COMMENT = 256;

const InfoLink = () => <Link variant="info">Info</Link>;

export default function CreateHostedZonePage() {
  const router = useRouter();
  const { notify } = useShell();
  const create = useCreateZone();
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const [region, setRegion] = useState<string | null>(null);
  const [vpcId, setVpcId] = useState("");
  const [vpcNoticeOpen, setVpcNoticeOpen] = useState(true);
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
  const regionError = type === "private" && !region ? "Choose a region" : "";
  const vpcError = type === "private" && !vpcId.trim() ? "VPC ID is required for a private hosted zone" : "";
  const tagKeyError = (t: Tag) => (!t.key.trim() ? "Key is required" : tags.filter((x) => x.key === t.key).length > 1 ? "Keys must be unique" : "");
  const invalid = Boolean(nameError || regionError || vpcError || tags.some(tagKeyError));

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
      notify(
        "success",
        "Now you can create records in the hosted zone to specify how you want Route 53 to route traffic for your domain.",
        `${zone.name.replace(/\.$/, "")} was successfully created.`,
      );
      router.push(`/hosted-zones/${zone.id}`);
    } catch (e) {
      setServerError((e as Error).message);
    }
  }

  return (
    <ContentLayout header={<Header variant="h1" info={<InfoLink />}>Create hosted zone</Header>}>
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
            <Container
              header={
                <Header
                  variant="h2"
                  description="A hosted zone is a container that holds information about how you want to route traffic for a domain, such as example.com, and its subdomains."
                >
                  Hosted zone configuration
                </Header>
              }
            >
              <SpaceBetween size="l">
                <FormField
                  label="Domain name"
                  info={<InfoLink />}
                  description="This is the name of the domain that you want to route traffic for."
                  constraintText={'Valid characters: a-z, 0-9, ! " # $ % & \' ( ) * + , - / : ; < = > ? @ [ \\ ] ^ _ ` { | } . ~'}
                  errorText={submitted ? nameError : ""}
                >
                  <Input value={name} onChange={({ detail }) => setName(detail.value)} />
                </FormField>
                <FormField
                  label={<>Description <i>- optional</i></>}
                  info={<InfoLink />}
                  description="This value lets you distinguish hosted zones that have the same name."
                  constraintText={`The description can have up to ${MAX_COMMENT} characters. ${comment.length}/${MAX_COMMENT}`}
                >
                  <Textarea
                    value={comment}
                    rows={3}
                    placeholder="The hosted zone is used for..."
                    onChange={({ detail }) => setComment(detail.value.slice(0, MAX_COMMENT))}
                  />
                </FormField>
                <FormField
                  label="Type"
                  info={<InfoLink />}
                  description="The type indicates whether you want to route traffic on the internet or in an Amazon VPC."
                >
                  <Tiles
                    columns={2}
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
              <Container
                header={
                  <Header
                    variant="h2"
                    info={<InfoLink />}
                    description="To use this hosted zone to resolve DNS queries for one or more VPCs, choose the VPCs. To associate a VPC with a hosted zone when the VPC was created using a different AWS account, you must use a programmatic method, such as the AWS CLI."
                  >
                    VPCs to associate with the hosted zone
                  </Header>
                }
              >
                <SpaceBetween size="l">
                  {vpcNoticeOpen && (
                    <Alert type="info" dismissible onDismiss={() => setVpcNoticeOpen(false)}>
                      For each VPC that you associate with a private hosted zone, you must set the Amazon VPC settings{" "}
                      <Link external href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-considerations.html#hosted-zone-private-considerations-vpc-settings">
                        enableDnsHostnames and enableDnsSupport
                      </Link>{" "}
                      to true.
                    </Alert>
                  )}
                  <SpaceBetween direction="horizontal" size="s" alignItems="end">
                    <FormField label="Region" info={<InfoLink />} errorText={submitted ? regionError : ""}>
                      <Select
                        selectedOption={region ? { value: region, label: REGIONS.find((r) => r.code === region)?.name ?? region } : null}
                        placeholder="Choose region"
                        filteringType="auto"
                        filteringPlaceholder="Find region"
                        options={REGIONS.map((r) => ({ value: r.code, label: r.name, description: r.code }))}
                        onChange={({ detail }) => setRegion(detail.selectedOption.value ?? null)}
                      />
                    </FormField>
                    <FormField label="VPC ID" info={<InfoLink />} errorText={submitted ? vpcError : ""}>
                      <Input value={vpcId} type="search" placeholder="Choose VPC" onChange={({ detail }) => setVpcId(detail.value)} />
                    </FormField>
                    <Button formAction="none" disabled>Remove VPC</Button>
                  </SpaceBetween>
                  <Box>
                    <Button formAction="none" disabled>Add VPC</Button>
                    <Box variant="small" color="text-body-secondary" margin={{ left: "s" }} display="inline-block">
                      This clone supports one VPC per hosted zone.
                    </Box>
                  </Box>
                </SpaceBetween>
              </Container>
            )}

            <Container
              header={
                <Header variant="h2" info={<InfoLink />} description="Apply tags to hosted zones to help organize and identify them.">
                  Tags
                </Header>
              }
            >
              <SpaceBetween size="s">
                {tags.length === 0 && <Box color="text-body-secondary">No tags associated with the resource.</Box>}
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
