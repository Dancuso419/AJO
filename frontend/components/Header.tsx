"use client";

import React from "react";
import Link from "next/link";
import { RainbowKitCustomConnectButton } from "~~/components/helper";

/**
 * AJO top bar — wordmark left, wallet right. Charcoal, persistent.
 */
export const Header = () => {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--ajo-line)] bg-[var(--ajo-bg)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span
            className="grid h-7 w-7 rotate-45 place-items-center rounded-[7px] border border-[var(--ajo-gold-line)] transition-transform duration-300 group-hover:rotate-[135deg]"
            style={{ background: "var(--ajo-gold-soft)" }}
          >
            <span className="-rotate-45 text-[13px] font-black text-[var(--ajo-gold-bright)] transition-transform duration-300 group-hover:rotate-[-135deg]">
              A
            </span>
          </span>
          <span className="text-[17px] font-bold tracking-tight text-[var(--ajo-ink)]">AJO</span>
          <span className="ml-1 hidden text-xs text-[var(--ajo-faint)] sm:inline">confidential savings</span>
        </Link>
        <RainbowKitCustomConnectButton />
      </div>
    </header>
  );
};
