"use client";

import { Alert, Box, Button, Container, Form, FormField, Header, Input, SpaceBetween } from "@cloudscape-design/components";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f2f3f3", display: "flex", justifyContent: "center", paddingTop: 80 }}>
      <div style={{ width: 400 }}>
        <Box textAlign="center" margin={{ bottom: "l" }} fontSize="heading-xl" fontWeight="bold">
          aws
        </Box>
        <Container header={<Header variant="h1">Sign in</Header>}>
          <form onSubmit={onSubmit}>
            <Form actions={<Button variant="primary" formAction="submit" loading={submitting}>Sign in</Button>}>
              <SpaceBetween size="l">
                {error && <Alert type="error">{error}</Alert>}
                <FormField label="IAM user name">
                  <Input value={username} onChange={({ detail }) => setUsername(detail.value)} autoFocus />
                </FormField>
                <FormField label="Password">
                  <Input type="password" value={password} onChange={({ detail }) => setPassword(detail.value)} />
                </FormField>
                <Box color="text-body-secondary" fontSize="body-s">Demo credentials: admin / admin123</Box>
              </SpaceBetween>
            </Form>
          </form>
        </Container>
      </div>
    </div>
  );
}
