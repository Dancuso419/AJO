"use client";

import React from "react";
import Link from "next/link";
import { RainbowKitCustomConnectButton } from "~~/components/helper";

/**
 * AJO floating pill nav — a wide, detached bar: wordmark left, wallet right.
 */
export const Header = () => {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-30 px-4">
      <div className="pointer-events-auto mx-auto flex max-w-3xl items-center justify-between rounded-full border border-[var(--ajo-line-strong)] bg-[var(--ajo-bg)]/70 py-2.5 pl-6 pr-2.5 shadow-[0_16px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-[var(--ajo-ink)] transition-colors hover:text-[var(--ajo-gold-bright)]"
        >
          AJO
        </Link>
        <RainbowKitCustomConnectButton />
      </div>
    </header>
  );
};
