import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { trpc, createTRPCClient } from "./lib/trpc";
import { adminTokenAtom } from "./lib/atoms";
import LoginPage from "./components/LoginPage";
import DashboardLayout from "./components/DashboardLayout";

export default function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AdminGate />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

function AdminGate() {
  const token = useAtomValue(adminTokenAtom);
  return token ? <DashboardLayout /> : <LoginPage />;
}
