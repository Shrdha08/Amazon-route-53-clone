"use client";

import "@cloudscape-design/global-styles/index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 15_000 } } }));
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
