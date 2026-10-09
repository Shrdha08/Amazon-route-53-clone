"use client";

import { Box, Button, SpaceBetween } from "@cloudscape-design/components";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth";

function Home() {
  const { user, logout } = useAuth();
  const router = useRouter();
  return (
    <Box padding="xxl">
      <SpaceBetween size="m">
        <Box variant="h1">Signed in as {user?.username} (account {user?.account_id})</Box>
        <Button
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          Sign out
        </Button>
      </SpaceBetween>
    </Box>
  );
}

export default function Page() {
  return (
    <AuthGuard>
      <Home />
    </AuthGuard>
  );
}
