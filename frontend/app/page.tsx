"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { ConfidentialAjo } from "~~/contracts/ConfidentialAjo";
import { useAjo } from "~~/hooks/useAjo";
import { deploymentFor } from "~~/utils/contract";

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
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6">
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
  return (
    <main className="relative mx-auto flex min-h-[78vh] max-w-3xl flex-col justify-center px-5 sm:px-6">
      <CipherBanner />
      <p className="ajo-mono mb-5 text-xs tracking-[0.3em] text-[var(--ajo-gold)]">
        ESUSU · SUSU · CHAMA · TANDA · HUI
      </p>
      <h1 className="max-w-2xl text-5xl font-bold leading-[0.98] tracking-tight text-[var(--ajo-ink)] sm:text-6xl">
        The savings circle,
        <br />
        <span className="text-[var(--ajo-gold-bright)]">sealed by cryptography.</span>
      </h1>
      <p className="mt-6 max-w-lg text-lg leading-relaxed text-[var(--ajo-muted)]">
        Everyone pays in, one member takes the pot each round. Enforced on-chain so no one can cheat — and every amount
        stays encrypted, so only you can ever see your own.
      </p>
      <div className="mt-9 flex items-center gap-4">
        <RainbowKitCustomConnectButton />
        <span className="ajo-mono text-xs text-[var(--ajo-faint)]">on Ethereum Sepolia</span>
      </div>
    </main>
  );
}

// Faint scrambling characters drifting behind the hero — the ciphertext motif.
function CipherBanner() {
  const [rows, setRows] = useState<string[]>([]);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chars = "0123456789ABCDEF◆▚▞∎·×";
    const make = () =>
      Array.from({ length: 6 }, () =>
        Array.from({ length: 46 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""),
      );
    setRows(make());
    if (reduce) return;
    const id = setInterval(() => setRows(make()), 140);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      aria-hidden
      className="ajo-mono pointer-events-none absolute right-0 top-6 hidden select-none text-[11px] leading-5 text-[var(--ajo-gold)] opacity-[0.06] sm:block"
    >
      {rows.map((r, i) => (
        <div key={i}>{r}</div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- Home */

function HomePanel({ onCreate, onOpen }: { onCreate: () => void; onOpen: (id: bigint) => void }) {
  const { isConnected } = useAccount();
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
        Switch your wallet to the <b className="text-[var(--ajo-ink)]">Sepolia</b> network to use AJO.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="ajo-rise flex items-end justify-between" style={{ animationDelay: "0ms" }}>
        <div>
          <div className="ajo-mono text-xs uppercase tracking-[0.2em] text-[var(--ajo-faint)]">Live on Sepolia</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="ajo-mono text-6xl font-bold leading-none text-[var(--ajo-gold-bright)]">
              {count.toString()}
            </span>
            <span className="text-[var(--ajo-muted)]">{count === 1n ? "circle" : "circles"} running</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1.1fr_1fr]">
        <div className="ajo-card ajo-rise p-6" style={{ animationDelay: "60ms" }}>
          <h3 className="text-lg font-semibold text-[var(--ajo-ink)]">Start a circle</h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--ajo-muted)]">
            Invite members by address, set the stake and rotation. The contract handles the rest.
          </p>
          <button className="ajo-btn ajo-btn-gold mt-5" onClick={onCreate}>
            Create a circle →
          </button>
        </div>

        <div className="ajo-card ajo-rise p-6" style={{ animationDelay: "120ms" }}>
          <h3 className="text-lg font-semibold text-[var(--ajo-ink)]">Open a circle</h3>
          <div className="mt-4 flex gap-2">
            <input
              className="ajo-input ajo-mono"
              placeholder="circle #"
              value={openId}
              onChange={e => setOpenId(e.target.value.replace(/\D/g, ""))}
            />
            <button className="ajo-btn ajo-btn-ghost" disabled={openId === ""} onClick={() => onOpen(BigInt(openId))}>
              Open
            </button>
          </div>
          {count > 0n && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: Number(count) }, (_, i) => (
                <button
                  key={i}
                  className="ajo-mono rounded-lg border border-[var(--ajo-line-strong)] px-2.5 py-1 text-xs text-[var(--ajo-muted)] transition hover:border-[var(--ajo-gold-line)] hover:text-[var(--ajo-gold-bright)]"
                  onClick={() => onOpen(BigInt(i))}
                >
                  #{i}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Create form */

function CreateGroup({ onDone, onCancel }: { onDone: (id?: bigint) => void; onCancel: () => void }) {
  const ajo = useAjo(undefined);
  const [amount, setAmount] = useState("100");
  const [duration, setDuration] = useState("3600");
  const [addresses, setAddresses] = useState("");

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
      <button
        className="ajo-mono mb-5 text-xs text-[var(--ajo-faint)] transition hover:text-[var(--ajo-gold)]"
        onClick={onCancel}
      >
        ← back
      </button>
      <h2 className="text-2xl font-bold tracking-tight text-[var(--ajo-ink)]">New circle</h2>
      <div className="mt-6 space-y-5">
        <Field
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
          <Field label="Stake per round" hint="in AJOT">
            <input
              className="ajo-input ajo-mono"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <Field label="Round length" hint="in seconds">
            <input
              className="ajo-input ajo-mono"
              value={duration}
              onChange={e => setDuration(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
        </div>
        <button className="ajo-btn ajo-btn-gold w-full" disabled={!valid || ajo.busy} onClick={submit}>
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
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
      <button
        className="ajo-mono text-xs text-[var(--ajo-faint)] transition hover:text-[var(--ajo-gold)]"
        onClick={onBack}
      >
        ← all circles
      </button>

      {/* Header */}
      <div className={`ajo-card ajo-rise p-6 ${g.active ? "ajo-card-active" : ""}`}>
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
      <div className="ajo-card ajo-rise p-6" style={{ animationDelay: "60ms" }}>
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
      <div className="ajo-card ajo-rise p-6" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--ajo-ink)]">Your private ledger</h3>
          <span className="ajo-mono text-xs text-[var(--ajo-faint)]">encrypted · only you hold the key</span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <CipherStat title="Contributed" value={a.decryptedContrib} revealed={a.isRevealed} />
          <CipherStat title="Received" value={a.decryptedPayout} revealed={a.isRevealed} />
        </div>
        <button
          className={`ajo-btn mt-5 ${a.isRevealed ? "ajo-btn-ghost" : "ajo-btn-gold"}`}
          disabled={a.isRevealing}
          onClick={a.revealMyHistory}
        >
          {a.isRevealing ? "Decrypting…" : a.isRevealed ? "✓ Revealed to you only" : "Decrypt my ledger"}
        </button>
      </div>

      {/* Actions */}
      <div className="ajo-card ajo-rise p-6" style={{ animationDelay: "180ms" }}>
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
