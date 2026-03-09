import { atom } from "jotai";

const rawTokenAtom = atom<string | null>(
  typeof window !== "undefined" ? localStorage.getItem("admin_token") : null,
);

export const adminTokenAtom = atom(
  (get) => get(rawTokenAtom),
  (_get, set, value: string | null) => {
    set(rawTokenAtom, value);
    if (value) {
      localStorage.setItem("admin_token", value);
    } else {
      localStorage.removeItem("admin_token");
    }
  },
);
