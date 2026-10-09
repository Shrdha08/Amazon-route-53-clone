import type { ReactNode } from "react";
import AuthGuard from "@/components/AuthGuard";
import ConsoleShell from "@/components/ConsoleShell";

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <ConsoleShell>{children}</ConsoleShell>
    </AuthGuard>
  );
}
