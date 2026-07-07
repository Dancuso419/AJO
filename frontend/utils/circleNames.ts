"use client";

import { useCallback, useEffect, useState } from "react";

// Local, per-browser nicknames for circles. Purely cosmetic — nothing goes
// on-chain, so only this device sees them. Keyed by group id.
const KEY = (id: bigint) => `ajo_name_${id.toString()}`;

export function getCircleName(id: bigint): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY(id)) ?? "";
}

/** Read + write a circle's local nickname, kept in sync across components on the page. */
export function useCircleName(id: bigint): [string, (name: string) => void] {
  const [name, setName] = useState("");

  useEffect(() => setName(getCircleName(id)), [id]);

  useEffect(() => {
    const sync = () => setName(getCircleName(id));
    window.addEventListener("ajo-names", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ajo-names", sync);
      window.removeEventListener("storage", sync);
    };
  }, [id]);

  const save = useCallback(
    (next: string) => {
      const trimmed = next.trim().slice(0, 40);
      if (trimmed) localStorage.setItem(KEY(id), trimmed);
      else localStorage.removeItem(KEY(id));
      setName(trimmed);
      window.dispatchEvent(new Event("ajo-names")); // notify other components
    },
    [id],
  );

  return [name, save];
}
