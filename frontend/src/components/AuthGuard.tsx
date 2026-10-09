"use client";

import { Spinner } from "@cloudscape-design/components";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Spinner size="large" />
      </div>
    );
  }
  return <>{children}</>;
}
