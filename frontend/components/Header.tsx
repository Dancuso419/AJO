"use client";

import React from "react";
import Link from "next/link";
import { RainbowKitCustomConnectButton } from "~~/components/helper";

/**
 * AJO floating pill nav — just the wordmark + wallet, detached and centered.
 */
export const Header = () => {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-[var(--ajo-line-strong)] bg-[var(--ajo-bg)]/70 py-2 pl-5 pr-2 shadow-[0_14px_44px_-18px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <Link
          href="/"
          className="text-[15px] font-bold tracking-tight text-[var(--ajo-ink)] transition-colors hover:text-[var(--ajo-gold-bright)]"
        >
          AJO
        </Link>
        <RainbowKitCustomConnectButton />
      </div>
    </header>
  );
};
