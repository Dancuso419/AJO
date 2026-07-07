"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { ConfidentialAjo } from "~~/contracts/ConfidentialAjo";
import { useAjo } from "~~/hooks/useAjo";
import { deploymentFor } from "~~/utils/contract";
import { runCreateTourOnce, runDashboardTourOnce, startCreateTour, startDashboardTour } from "~~/utils/tour";

function TourButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="ajo-mono inline-flex items-center gap-1.5 rounded-full border border-[var(--ajo-line-strong)] px-3 py-1.5 text-xs text-[var(--ajo-muted)] transition hover:border-[var(--ajo-gold-line)] hover:text-[var(--ajo-gold-bright)]"
      onClick={onClick}
    >
      <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--ajo-gold-soft)] text-[10px] font-bold text-[var(--ajo-gold-bright)]">
        ?
      </span>
      Guide me
    </button>
  );
}

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}
const eq = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export default function Home() {
  const { isConnected } = useAccount();
  const [groupId, setGroupId] = useState<bigint | undefined>(undefined);
  const [view, setView] = useState<"home" | "create">("home");

  if (!isConnected) return <Landing />;

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-28 sm:px-6">
      {groupId !== undefined ? (
        <GroupDashboard groupId={groupId} onBack={() => setGroupId(undefined)} />
      ) : view === "create" ? (
        <CreateGroup
          onDone={id => {
            setView("home");
            if (id !== undefined) setGroupId(id);
          }}
          onCancel={() => setView("home")}
        />
      ) : (
        <HomePanel onCreate={() => setView("create")} onOpen={setGroupId} />
      )}
    </main>
  );
}

/* ---------------------------------------------------------------- Landing */

function Landing() {
  const scrollToHow = () => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
  return (
    <div className="mx-auto max-w-5xl px-5 sm:px-6">
      {/* Hero */}
      <section className="relative flex min-h-[92vh] flex-col justify-center overflow-hidden py-24">
        <CipherBanner />
        <p className="ajo-mono mb-6 max-w-full truncate text-[11px] tracking-[0.25em] text-[var(--ajo-gold)] sm:text-xs sm:tracking-[0.3em]">
          ESUSU · SUSU · CHAMA · TANDA · HUI · PALUWAGAN
        </p>
        <h1 className="max-w-3xl text-balance text-[2rem] font-bold leading-[1.02] tracking-tight text-[var(--ajo-ink)] sm:text-6xl sm:leading-[0.98] md:text-7xl">
          The savings circle, <span className="text-[var(--ajo-gold-bright)]">sealed by cryptography.</span>
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--ajo-muted)]">
          For centuries, communities have saved together: everyone pays in, one person takes the pot, rotating until all
          have had their turn. AJO puts that on-chain — so no one can cheat — while every amount stays{" "}
          <span className="text-[var(--ajo-ink)]">encrypted end to end.</span>
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <RainbowKitCustomConnectButton />
          <button className="ajo-btn ajo-btn-ghost" onClick={scrollToHow}>
            How it works ↓
          </button>
          <span className="ajo-mono text-xs text-[var(--ajo-faint)]">live on Sepolia testnet</span>
        </div>
      </section>

      {/* What it is */}
      <section className="border-t border-[var(--ajo-line)] py-20">
        <div className="grid gap-10 sm:grid-cols-[0.9fr_1.1fr] sm:gap-16">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-[var(--ajo-ink)]">
            A rotating savings club,
            <br />
            used by <span className="text-[var(--ajo-gold-bright)]">a billion people.</span>
          </h2>
          <p className="max-w-lg self-center text-lg leading-relaxed text-[var(--ajo-muted)]">
            Known as ajo or esusu in West Africa, susu in Ghana, chama in Kenya, tanda in Mexico, hui in China. A small
            group agrees a fixed amount and a rotation. Each round everyone contributes; one member receives the entire
            pool. It’s trust, structure, and discipline — powered until now by a human collector.
          </p>
        </div>
      </section>

      {/* Two problems AJO fixes */}
      <section className="border-t border-[var(--ajo-line)] py-20">
        <h2 className="mb-10 text-3xl font-bold tracking-tight text-[var(--ajo-ink)]">The two problems we fix</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <ProblemCard
            tag="Trust"
            title="No collector can run off with the pot."
            body="Contributions and payouts are enforced by the contract. Nobody under-reports what you paid, skips a payout, or absconds with the fund. The rules are the code."
          />
          <ProblemCard
            tag="Privacy"
            title="The group never sees your numbers."
            body="Every amount is encrypted with Zama’s FHE. Members see that you paid — a public checkmark — but never how much. Only your wallet’s signature can reveal your own history."
            gold
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-24 border-t border-[var(--ajo-line)] py-20">
        <h2 className="mb-12 text-3xl font-bold tracking-tight text-[var(--ajo-ink)]">How it works</h2>
        <div className="grid gap-10 sm:grid-cols-3">
          <Step
            n="01"
            title="Create a circle"
            body="Invite members by wallet address, set the stake per round and the rotation. Anyone in the list can join until the circle is full."
          />
          <Step
            n="02"
            title="Everyone contributes"
            body="Each round, members pay their stake in confidential tokens. Your amount is encrypted in your browser before it ever touches the chain."
          />
          <Step
            n="03"
            title="The pot rotates"
            body="Once all have paid, the round’s recipient automatically receives the pooled amount — encrypted, decryptable only by them. Repeat until everyone’s been paid once."
          />
        </div>
      </section>

      {/* Privacy payoff */}
      <section className="border-t border-[var(--ajo-line)] py-20">
        <div className="ajo-card ajo-card-active grid items-center gap-10 p-8 sm:grid-cols-[1.1fr_0.9fr] sm:p-12">
          <div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-[var(--ajo-ink)]">
              Only you hold <span className="text-[var(--ajo-gold-bright)]">the key.</span>
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-[var(--ajo-muted)]">
              On a normal blockchain, every amount is public forever. AJO keeps balances and payouts as ciphertext on
              Ethereum itself. Tap decrypt, sign once, and your numbers resolve — for your eyes only. Every other wallet
              gets nothing.
            </p>
          </div>
          <RevealDemo />
        </div>
      </section>

      {/* Closing */}
      <section className="border-t border-[var(--ajo-line)] py-20 text-center">
        <h2 className="mx-auto max-w-2xl text-balance text-4xl font-bold tracking-tight text-[var(--ajo-ink)]">
          Save together. Keep your numbers to yourself.
        </h2>
        <div className="mt-8 flex justify-center">
          <RainbowKitCustomConnectButton />
        </div>
        <div className="ajo-mono mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-[var(--ajo-faint)]">
          <a
            className="transition-colors hover:text-[var(--ajo-gold)]"
            href="https://sepolia.etherscan.io/address/0x357223395518B2E1639fDb6D065Dd0a8847b9C5E#code"
            target="_blank"
            rel="noreferrer"
          >
            verified contract ↗
          </a>
          <a
            className="transition-colors hover:text-[var(--ajo-gold)]"
            href="https://github.com/Dancuso419/AJO"
            target="_blank"
            rel="noreferrer"
          >
            source on github ↗
          </a>
          <span>built on Zama FHEVM</span>
        </div>
      </section>
    </div>
  );
}

function ProblemCard({ tag, title, body, gold }: { tag: string; title: string; body: string; gold?: boolean }) {
  return (
    <div className={`ajo-card p-7 ${gold ? "ajo-card-active" : ""}`}>
      <span className={`ajo-chip ${gold ? "ajo-chip-gold" : ""}`}>{tag}</span>
      <h3 className="mt-4 text-xl font-semibold text-[var(--ajo-ink)]">{title}</h3>
      <p className="mt-3 leading-relaxed text-[var(--ajo-muted)]">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div className="ajo-mono text-4xl font-bold text-[var(--ajo-gold)]">{n}</div>
      <div className="mt-3 h-px w-10 bg-[var(--ajo-gold-line)]" />
      <h3 className="mt-4 text-lg font-semibold text-[var(--ajo-ink)]">{title}</h3>
      <p className="mt-2 leading-relaxed text-[var(--ajo-muted)]">{body}</p>
    </div>
  );
}

// Mini self-running demo of the ciphertext → number reveal.
function RevealDemo() {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }
    const loop = setInterval(() => setRevealed(r => !r), 2600);
    return () => clearInterval(loop);
  }, []);
  return (
    <div className="rounded-2xl border border-[var(--ajo-line)] bg-[var(--ajo-bg-2)] p-6">
      <div className="ajo-mono text-xs uppercase tracking-[0.15em] text-[var(--ajo-faint)]">Your contributed total</div>
      <div className="mt-3 text-3xl">
        {revealed ? (
          <span className="ajo-mono ajo-rise font-bold text-[var(--ajo-ink)]">
            300 <span className="text-base font-normal text-[var(--ajo-muted)]">AJOT</span>
          </span>
        ) : (
          <Scramble />
        )}
      </div>
      <div className="mt-4 text-xs text-[var(--ajo-faint)]">
        {revealed ? "decrypted · visible only to you" : "encrypted on-chain"}
      </div>
    </div>
  );
}

// Faint scrambling characters drifting behind the hero — the ciphertext motif.
function CipherBanner() {
  const [rows, setRows] = useState<string[]>([]);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chars = "0123456789ABCDEF◆▚▞∎·×";
    const make = () =>
      Array.from({ length: 10 }, () =>
        Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""),
      );
    setRows(make());
    if (reduce) return;
    const id = setInterval(() => setRows(make()), 150);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      aria-hidden
      className="ajo-mono pointer-events-none absolute -right-10 top-0 hidden select-none text-[11px] leading-5 text-[var(--ajo-gold)] opacity-[0.05] sm:block"
      style={{
        maskImage: "linear-gradient(to left, black, transparent)",
        WebkitMaskImage: "linear-gradient(to left, black, transparent)",
      }}
    >
      {rows.map((r, i) => (
        <div key={i}>{r}</div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- Home */

function HomePanel({ onCreate, onOpen }: { onCreate: () => void; onOpen: (id: bigint) => void }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const ajo = deploymentFor(ConfidentialAjo, chainId);
  const { data: groupCount } = useReadContract({
    address: ajo?.address,
    abi: ajo?.abi,
    functionName: "groupCount",
    query: { enabled: Boolean(ajo?.address && isConnected) },
  });
  const count = (groupCount as bigint | undefined) ?? 0n;
  const [openId, setOpenId] = useState("");

  if (!ajo?.address) {
    return (
      <div className="ajo-card ajo-rise p-6 text-[var(--ajo-muted)]">
        You’re connected, but not on the right network. Switch your wallet to{" "}
        <b className="text-[var(--ajo-gold-bright)]">Ethereum Sepolia</b> to use AJO.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="ajo-rise flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--ajo-ink)] sm:text-4xl">Your circles</h1>
          <p className="mt-1 text-[var(--ajo-muted)]">Start a new savings circle, or open one you’re part of.</p>
        </div>
        {address && (
          <span className="ajo-chip">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ajo-gold-bright)]" />
            {short(address)}
          </span>
        )}
      </div>

      {/* Primary: create */}
      <div className="ajo-card ajo-card-active ajo-rise overflow-hidden" style={{ animationDelay: "60ms" }}>
        <div className="grid items-center gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--ajo-ink)]">Start a savings circle</h2>
            <p className="mt-3 max-w-md leading-relaxed text-[var(--ajo-muted)]">
              Invite members by wallet address and set the stake. Contributions are encrypted, and the pot rotates to
              each member automatically — no collector, nothing exposed.
            </p>
            <button className="ajo-btn ajo-btn-gold mt-6" onClick={onCreate}>
              Create a circle →
            </button>
          </div>
          <div className="hidden justify-self-center sm:block">
            <RotationRing />
          </div>
        </div>
      </div>

      {/* Open existing */}
      <div className="ajo-card ajo-rise p-6 sm:p-7" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--ajo-ink)]">Open a circle</h3>
          <span className="ajo-mono text-xs text-[var(--ajo-faint)]">{count.toString()} on Sepolia</span>
        </div>
        <div className="mt-4 flex max-w-xs gap-2">
          <input
            className="ajo-input ajo-mono"
            inputMode="numeric"
            placeholder="circle #"
            value={openId}
            onChange={e => setOpenId(e.target.value.replace(/\D/g, ""))}
          />
          <button className="ajo-btn ajo-btn-ghost" disabled={openId === ""} onClick={() => onOpen(BigInt(openId))}>
            Open
          </button>
        </div>
        {count > 0n ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {Array.from({ length: Number(count) }, (_, i) => (
              <button
                key={i}
                className="ajo-mono rounded-full border border-[var(--ajo-line-strong)] px-3 py-1.5 text-sm text-[var(--ajo-muted)] transition hover:border-[var(--ajo-gold-line)] hover:bg-[var(--ajo-gold-soft)] hover:text-[var(--ajo-gold-bright)]"
                onClick={() => onOpen(BigInt(i))}
              >
                Circle #{i}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--ajo-faint)]">No circles yet — be the first to start one.</p>
        )}
      </div>

      {/* First-timer hint */}
      <p className="ajo-mono px-1 text-xs leading-relaxed text-[var(--ajo-faint)]">
        new here? inside a circle you’ll <span className="text-[var(--ajo-muted)]">mint</span> test AJOT ·{" "}
        <span className="text-[var(--ajo-muted)]">approve</span> AJO once ·{" "}
        <span className="text-[var(--ajo-muted)]">contribute</span> each round · then{" "}
        <span className="text-[var(--ajo-gold)]">decrypt</span> your private ledger.
      </p>
    </div>
  );
}

// Signature visual: members arranged in a ring, the pot rotating between them.
function RotationRing({ size = 148 }: { size?: number }) {
  const dots = 6;
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive(a => (a + 1) % dots), 950);
    return () => clearInterval(id);
  }, []);
  const c = size / 2;
  const r = c - 16;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--ajo-line-strong)" strokeWidth={1} />
      <circle cx={c} cy={c} r={4} fill="var(--ajo-gold)" opacity={0.5} />
      {Array.from({ length: dots }).map((_, i) => {
        const ang = (i / dots) * 2 * Math.PI - Math.PI / 2;
        const x = c + r * Math.cos(ang);
        const y = c + r * Math.sin(ang);
        const on = i === active;
        return (
          <g key={i} className="ajo-node">
            {on && <line x1={c} y1={c} x2={x} y2={y} stroke="var(--ajo-gold-line)" strokeWidth={1} />}
            <circle
              cx={x}
              cy={y}
              r={on ? 9 : 6}
              fill={on ? "var(--ajo-gold)" : "var(--ajo-surface-2)"}
              stroke={on ? "none" : "var(--ajo-line-strong)"}
              strokeWidth={1}
              style={{ transition: "all 300ms cubic-bezier(0.22,1,0.36,1)" }}
            />
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------ Create form */

function CreateGroup({ onDone, onCancel }: { onDone: (id?: bigint) => void; onCancel: () => void }) {
  const ajo = useAjo(undefined);
  const [amount, setAmount] = useState("100");
  const [duration, setDuration] = useState("3600");
  const [addresses, setAddresses] = useState("");

  useEffect(() => {
    runCreateTourOnce();
  }, []);

  const order = addresses
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean) as `0x${string}`[];
  const valid =
    order.length >= 2 && order.every(a => /^0x[0-9a-fA-F]{40}$/.test(a)) && amount !== "" && duration !== "";

  const submit = async () => {
    const before = ajo.groupCount;
    const ok = await ajo.createGroup(BigInt(order.length), BigInt(amount), BigInt(duration), order);
    if (ok) onDone(before);
  };

  return (
    <div className="ajo-card ajo-rise p-6 sm:p-7">
      <div className="mb-5 flex items-center justify-between">
        <button
          className="ajo-mono text-xs text-[var(--ajo-faint)] transition hover:text-[var(--ajo-gold)]"
          onClick={onCancel}
        >
          ← back
        </button>
        <TourButton onClick={startCreateTour} />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-[var(--ajo-ink)]">New circle</h2>
      <div className="mt-6 space-y-5">
        <Field
          tour="members"
          label="Members & payout order"
          hint="One address per line, in the order they receive the pot. Minimum 2."
        >
          <textarea
            className="ajo-input ajo-mono h-28 text-xs"
            placeholder={"0xAlice…\n0xBob…\n0xCarol…"}
            value={addresses}
            onChange={e => setAddresses(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field tour="stake" label="Stake per round" hint="in AJOT">
            <input
              className="ajo-input ajo-mono"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <Field tour="duration" label="Round length" hint="in seconds">
            <input
              className="ajo-input ajo-mono"
              value={duration}
              onChange={e => setDuration(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
        </div>
        <button
          data-tour="create-submit"
          className="ajo-btn ajo-btn-gold w-full"
          disabled={!valid || ajo.busy}
          onClick={submit}
        >
          {ajo.busy
            ? "Creating…"
            : valid
              ? `Create circle · ${order.length} members`
              : "Add at least 2 valid addresses"}
        </button>
        {ajo.message && <StatusLine text={ajo.message} />}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  tour,
  children,
}: {
  label: string;
  hint?: string;
  tour?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block" data-tour={tour}>
      <span className="text-sm font-medium text-[var(--ajo-ink)]">{label}</span>
      {hint && <span className="ml-2 text-xs text-[var(--ajo-faint)]">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

/* -------------------------------------------------------------- Dashboard */

function GroupDashboard({ groupId, onBack }: { groupId: bigint; onBack: () => void }) {
  const a = useAjo(groupId);
  const g = a.group;
  const ready = !!g && a.onSupportedNetwork;

  useEffect(() => {
    if (ready) runDashboardTourOnce();
  }, [ready]);

  if (!a.onSupportedNetwork)
    return <div className="ajo-card p-6 text-[var(--ajo-muted)]">Switch to Sepolia to view this circle.</div>;
  if (!g)
    return <div className="ajo-card ajo-rise p-6 text-[var(--ajo-muted)]">Loading circle #{groupId.toString()}…</div>;

  const round = g.currentRound;
  const recipient = round > 0n ? a.payoutOrder[Number(round) - 1] : undefined;
  const myTurn = eq(recipient, a.address);
  const iAmMember = a.payoutOrder.some(x => eq(x, a.address));
  const status = g.active ? "ACTIVE" : g.currentRound === 0n ? "FILLING" : "COMPLETE";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          className="ajo-mono text-xs text-[var(--ajo-faint)] transition hover:text-[var(--ajo-gold)]"
          onClick={onBack}
        >
          ← all circles
        </button>
        <TourButton onClick={startDashboardTour} />
      </div>

      {/* Header */}
      <div data-tour="overview" className={`ajo-card ajo-rise p-6 ${g.active ? "ajo-card-active" : ""}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--ajo-ink)]">
            Circle <span className="ajo-mono text-[var(--ajo-gold-bright)]">#{groupId.toString()}</span>
          </h2>
          <span className={`ajo-chip ${g.active ? "ajo-chip-gold" : ""}`}>
            <span
              className={`h-1.5 w-1.5 rounded-full ${g.active ? "bg-[var(--ajo-gold-bright)]" : "bg-[var(--ajo-faint)]"}`}
            />
            {status}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4">
          <Stat label="Members" value={g.memberCount.toString()} />
          <Stat label="Stake / round" value={`${g.contributionAmount.toString()}`} unit="AJOT" />
          <Stat
            label="Round"
            value={g.currentRound === 0n ? "—" : `${g.currentRound}`}
            unit={g.currentRound === 0n ? "" : `of ${g.memberCount}`}
          />
        </div>
        {recipient && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-[var(--ajo-line)] bg-[var(--ajo-bg-2)] px-4 py-3 text-sm">
            <span className="text-[var(--ajo-muted)]">This round’s pot goes to</span>
            <span className="ajo-mono text-[var(--ajo-ink)]">{short(recipient)}</span>
            {myTurn && <span className="ajo-chip ajo-chip-gold ml-auto">your turn</span>}
          </div>
        )}
      </div>

      {/* Rotation track */}
      <div data-tour="rotation" className="ajo-card ajo-rise p-6" style={{ animationDelay: "60ms" }}>
        <div className="ajo-mono mb-4 text-xs uppercase tracking-[0.2em] text-[var(--ajo-faint)]">The rotation</div>
        <div className="flex items-start gap-1 overflow-x-auto pb-1">
          {a.payoutOrder.map((m, i) => (
            <TrackNode
              key={m}
              groupId={groupId}
              member={m}
              index={i}
              round={round}
              isRecipient={eq(m, recipient)}
              me={a.address}
              last={i === a.payoutOrder.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Private history — the money shot */}
      <div data-tour="ledger" className="ajo-card ajo-rise p-6" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--ajo-ink)]">Your private ledger</h3>
          <span className="ajo-mono text-xs text-[var(--ajo-faint)]">encrypted · only you hold the key</span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <CipherStat title="Contributed" value={a.decryptedContrib} revealed={a.isRevealed} />
          <CipherStat title="Received" value={a.decryptedPayout} revealed={a.isRevealed} />
        </div>
        <button
          data-tour="reveal"
          className={`ajo-btn mt-5 ${a.isRevealed ? "ajo-btn-ghost" : "ajo-btn-gold"}`}
          disabled={a.isRevealing}
          onClick={a.revealMyHistory}
        >
          {a.isRevealing ? "Decrypting…" : a.isRevealed ? "✓ Revealed to you only" : "Decrypt my ledger"}
        </button>
      </div>

      {/* Actions */}
      <div data-tour="actions" className="ajo-card ajo-rise p-6" style={{ animationDelay: "180ms" }}>
        <h3 className="text-lg font-semibold text-[var(--ajo-ink)]">Actions</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          {g.currentRound === 0n && iAmMember && (
            <button className="ajo-btn ajo-btn-gold" disabled={a.busy} onClick={a.joinGroup}>
              Join this circle
            </button>
          )}
          <button className="ajo-btn ajo-btn-ghost" disabled={a.busy} onClick={() => a.mintTestTokens(1000n)}>
            Mint 1000 AJOT
          </button>
          <button className="ajo-btn ajo-btn-ghost" disabled={a.busy} onClick={a.approveAjo}>
            Approve AJO
          </button>
          {g.active && (
            <button className="ajo-btn ajo-btn-gold" disabled={a.busy} onClick={a.contribute}>
              Contribute {g.contributionAmount.toString()} AJOT
            </button>
          )}
        </div>
        <p className="ajo-mono mt-4 text-xs leading-relaxed text-[var(--ajo-faint)]">
          first time → mint · approve once · then contribute each round
        </p>
        {a.message && <StatusLine text={a.message} />}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Fragments */

function TrackNode({
  groupId,
  member,
  index,
  round,
  isRecipient,
  me,
  last,
}: {
  groupId: bigint;
  member: `0x${string}`;
  index: number;
  round: bigint;
  isRecipient: boolean;
  me?: string;
  last: boolean;
}) {
  const chainId = useChainId();
  const ajo = deploymentFor(ConfidentialAjo, chainId);
  const { data: joined } = useReadContract({
    address: ajo?.address,
    abi: ajo?.abi,
    functionName: "isMember",
    args: [groupId, member],
    query: { enabled: Boolean(ajo?.address) },
  });
  const { data: paid } = useReadContract({
    address: ajo?.address,
    abi: ajo?.abi,
    functionName: "hasPaidThisRound",
    args: [groupId, round, member],
    query: { enabled: Boolean(ajo?.address && round > 0n) },
  });
  const isMe = eq(member, me);

  return (
    <div className="flex min-w-[92px] flex-1 flex-col items-center">
      <div className="flex w-full items-center">
        <span className="h-px flex-1" />
        <span
          className={`ajo-node grid h-11 w-11 place-items-center rounded-full border text-sm font-bold ${
            isRecipient
              ? "border-transparent bg-[var(--ajo-gold)] text-[#171310] shadow-[0_0_22px_-4px_var(--ajo-gold)]"
              : paid
                ? "border-[var(--ajo-gold-line)] bg-[var(--ajo-gold-soft)] text-[var(--ajo-gold-bright)]"
                : "border-[var(--ajo-line-strong)] bg-[var(--ajo-surface-2)] text-[var(--ajo-muted)]"
          }`}
        >
          {paid && !isRecipient ? "✓" : index + 1}
        </span>
        <span className={`h-px flex-1 ${last ? "opacity-0" : ""}`} style={{ background: "var(--ajo-line-strong)" }} />
      </div>
      <span className="ajo-mono mt-2 text-[11px] text-[var(--ajo-muted)]">{short(member)}</span>
      <span className={`ajo-mono text-[10px] ${isMe ? "text-[var(--ajo-gold-bright)]" : "text-[var(--ajo-faint)]"}`}>
        {isRecipient ? "◆ pot" : isMe ? "you" : joined ? (round > 0n ? (paid ? "paid" : "waiting") : "joined") : "—"}
      </span>
    </div>
  );
}

// Encrypted number that scrambles like ciphertext until decrypted.
function CipherStat({ title, value, revealed }: { title: string; value?: bigint; revealed: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--ajo-line)] bg-[var(--ajo-bg-2)] p-4">
      <div className="ajo-mono text-xs uppercase tracking-[0.15em] text-[var(--ajo-faint)]">{title}</div>
      <div className="mt-2 text-2xl">
        {revealed && value !== undefined ? (
          <span className="ajo-mono ajo-rise font-bold text-[var(--ajo-ink)]">
            {value.toString()} <span className="text-sm font-normal text-[var(--ajo-muted)]">AJOT</span>
          </span>
        ) : (
          <Scramble />
        )}
      </div>
    </div>
  );
}

function Scramble() {
  const [txt, setTxt] = useState("××××××");
  const ref = useRef<string>("");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTxt("● ● ● ●");
      return;
    }
    const chars = "0123456789ABCDEF◆▚∎·×";
    const id = setInterval(() => {
      let s = "";
      for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
      ref.current = s;
      setTxt(s);
    }, 85);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="ajo-cipher inline-flex items-center gap-2 text-2xl font-bold">
      <span aria-hidden>🔒</span>
      {txt}
    </span>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="ajo-mono text-xs uppercase tracking-[0.12em] text-[var(--ajo-faint)]">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="ajo-mono text-2xl font-bold text-[var(--ajo-ink)]">{value}</span>
        {unit && <span className="text-xs text-[var(--ajo-muted)]">{unit}</span>}
      </div>
    </div>
  );
}

function StatusLine({ text }: { text: string }) {
  return (
    <div className="ajo-mono mt-4 rounded-xl border border-[var(--ajo-line)] bg-[var(--ajo-bg-2)] px-4 py-3 text-xs text-[var(--ajo-muted)]">
      {text}
    </div>
  );
}
