"use client";

import { Box, Button, Container, ContentLayout, Header, SpaceBetween } from "@cloudscape-design/components";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useBreadcrumbs } from "@/components/ConsoleShell";

interface Props {
  title: string;
  href: string;
  description: string;
}

/** Placeholder for console sections that are intentionally not implemented. */
export default function ComingSoon({ title, href, description }: Props) {
  const router = useRouter();
  useBreadcrumbs(useMemo(() => [{ text: "Route 53", href: "/hosted-zones" }, { text: title, href }], [title, href]));

  return (
    <ContentLayout header={<Header variant="h1">{title}</Header>}>
      <Container>
        <Box textAlign="center" padding={{ vertical: "xxl" }}>
          <SpaceBetween size="m">
            <Box variant="h2" color="text-body-secondary">Coming soon</Box>
            <Box color="text-body-secondary">{description}</Box>
            <Button variant="primary" onClick={() => router.push("/hosted-zones")}>Go to hosted zones</Button>
          </SpaceBetween>
        </Box>
      </Container>
    </ContentLayout>
  );
}
