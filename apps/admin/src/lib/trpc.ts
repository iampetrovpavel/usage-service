import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@usage-service/server/adapters/trpc/router";
import { getDefaultStore } from "jotai";
import { adminTokenAtom } from "./atoms";

export const trpc = createTRPCReact<AppRouter>();

const store = getDefaultStore();

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3400";

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: API_URL,
        headers() {
          const token = store.get(adminTokenAtom);
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
