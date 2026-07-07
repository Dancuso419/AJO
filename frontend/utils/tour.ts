"use client";

import { type DriveStep, driver } from "driver.js";

// driver.css is imported globally in app/layout.tsx

const base = {
  showProgress: true,
  overlayColor: "rgba(9, 8, 7, 0.72)",
  stagePadding: 6,
  stageRadius: 14,
  popoverClass: "ajo-tour",
  nextBtnText: "Next →",
  prevBtnText: "← Back",
  doneBtnText: "Got it",
};

// Plain-language, no-jargon explanations of every field in the "create" form.
const createSteps: DriveStep[] = [
  {
    element: '[data-tour="members"]',
    popover: {
      title: "Who’s in the circle",
      description:
        "Paste each person’s wallet address, one per line. The <b>order matters</b> — it’s the order people receive the pot. Line 1 gets it first, line 2 next, and so on. You need at least 2 people.",
    },
  },
  {
    element: '[data-tour="stake"]',
    popover: {
      title: "How much each person pays",
      description:
        "Everyone puts in this <b>same amount</b> every round. AJOT is free pretend money for testing — nothing real, so feel free to experiment.",
    },
  },
  {
    element: '[data-tour="duration"]',
    popover: {
      title: "How long a round lasts",
      description:
        "A simple timer, in seconds — <b>3600 = 1 hour</b>. It only matters if someone doesn’t pay; when everyone contributes, the pot pays out right away.",
    },
  },
  {
    element: '[data-tour="create-submit"]',
    popover: {
      title: "Create the circle",
      description:
        "This sets your circle up on the blockchain. Your wallet will pop up to confirm one small transaction — that’s normal.",
    },
  },
];

// Plain-language explanations of the dashboard: what each part means and does.
const dashboardSteps: DriveStep[] = [
  {
    element: '[data-tour="overview"]',
    popover: {
      title: "Your circle at a glance",
      description:
        "How many members are in, the amount each pays per round, and which round you’re on right now. It also shows whose turn it is to get the pot.",
    },
  },
  {
    element: '[data-tour="rotation"]',
    popover: {
      title: "The rotation",
      description:
        "Each dot is a member. The <b>gold</b> one is whose turn it is to receive the pot this round. A <b>✓</b> means that person has already paid in.",
    },
  },
  {
    element: '[data-tour="ledger"]',
    popover: {
      title: "Your private numbers",
      description:
        "How much you’ve put in and taken out. These are <b>encrypted on the blockchain</b>, so they show as scrambled code — even to you — until you unlock them.",
    },
  },
  {
    element: '[data-tour="reveal"]',
    popover: {
      title: "Only you can unlock these",
      description:
        "Tap here and sign in your wallet to decrypt <b>your own</b> totals. No one else can see them — not even the other members.",
    },
  },
  {
    element: '[data-tour="actions"]',
    popover: {
      title: "Paying your share",
      description:
        "First time: tap <b>Mint</b> for free test coins, then <b>Approve AJO</b> once (lets the app move your coins), then <b>Contribute</b> your share. You approve just once; you contribute each round.",
    },
  },
];

function run(steps: DriveStep[]) {
  const available = steps.filter(s => typeof s.element === "string" && document.querySelector(s.element as string));
  if (available.length === 0) return;
  driver({ ...base, steps: available }).drive();
}

export const startCreateTour = () => run(createSteps);
export const startDashboardTour = () => run(dashboardSteps);

/** Run a tour once per browser (keyed), e.g. the first time a screen is seen. */
export function runTourOnce(key: string, steps: DriveStep[]) {
  if (typeof window === "undefined") return;
  const flag = `ajo_tour_${key}`;
  if (localStorage.getItem(flag)) return;
  localStorage.setItem(flag, "1");
  // let the target elements mount/paint first
  setTimeout(() => run(steps), 450);
}
export const runCreateTourOnce = () => runTourOnce("create", createSteps);
export const runDashboardTourOnce = () => runTourOnce("dashboard", dashboardSteps);
