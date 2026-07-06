"use client";

import { useState } from "react";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { ConfidentialAjo } from "~~/contracts/ConfidentialAjo";
import { useAjo } from "~~/hooks/useAjo";
import { deploymentFor } from "~~/utils/contract";

const card = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
const btn =
  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40 disabled:pointer-events-none";
const primary = `${btn} bg-emerald-600 text-white hover:bg-emerald-700`;
const ghost = `${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
const label = "block text-sm font-medium text-slate-700";
const input =
  "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none";

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export default function Home() {
  const { isConnected } = useAccount();
  const [groupId, setGroupId] = useState<bigint | undefined>(undefined);
  const [view, setView] = useState<"home" | "create">("home");

  if (!isConnected) return <Landing />;

  return (
    <main className="min-h-[80vh] w-full bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Hero />
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
      </div>
    </main>
  );
}

function Hero() {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">AJO</h1>
        <RainbowKitCustomConnectButton />
      </div>
      <p className="mt-1 text-slate-600">
        A private rotating savings circle — amounts stay encrypted; only you can reveal your own.
      </p>
    </div>
  );
}

function Landing() {
  return (
    <main className="min-h-[80vh] w-full bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight">AJO</h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-slate-600">
          A private rotating savings circle. Contributions and payouts are enforced on-chain, but the amounts stay
          encrypted — only you can reveal your own.
        </p>
        <div className="mt-8 flex justify-center">
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    </main>
  );
}

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
      <div className={card}>
        <p className="text-slate-700">
          Switch your wallet to the <b>Sepolia</b> network to use AJO.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={card}>
        <div className="text-sm font-medium uppercase tracking-wide text-slate-500">On Sepolia</div>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-4xl font-bold text-emerald-600">{count.toString()}</span>
          <span className="text-slate-600">savings circles created</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={card}>
          <h3 className="font-semibold">Start a circle</h3>
          <p className="mt-1 text-sm text-slate-600">Invite members, set the amount and rotation.</p>
          <button className={`${primary} mt-4`} onClick={onCreate}>
            Create a circle
          </button>
        </div>
        <div className={card}>
          <h3 className="font-semibold">Open a circle</h3>
          <p className="mt-1 text-sm text-slate-600">Enter a circle number to view it.</p>
          <div className="mt-4 flex gap-2">
            <input className={input} placeholder="e.g. 0" value={openId} onChange={e => setOpenId(e.target.value)} />
            <button className={ghost} disabled={openId === ""} onClick={() => onOpen(BigInt(openId))}>
              Open
            </button>
          </div>
          {count > 0n && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: Number(count) }, (_, i) => (
                <button
                  key={i}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50"
                  onClick={() => onOpen(BigInt(i))}
                >
                  Circle #{i}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
    if (ok) onDone(before); // new group id == previous count
  };

  return (
    <div className={card}>
      <button className="mb-4 text-sm text-slate-500 hover:text-slate-700" onClick={onCancel}>
        ← Back
      </button>
      <h2 className="text-xl font-semibold">Create a savings circle</h2>
      <div className="mt-5 space-y-4">
        <div>
          <label className={label}>Members & payout order (one address per line)</label>
          <textarea
            className={`${input} h-28 font-mono text-xs`}
            placeholder={"0xabc…\n0xdef…\n0x123…"}
            value={addresses}
            onChange={e => setAddresses(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            These addresses are the members, in the order they receive the pot. Min 2.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Contribution per round (AJOT)</label>
            <input className={input} value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label className={label}>Round length (seconds)</label>
            <input className={input} value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
        </div>
        <button className={primary} disabled={!valid || ajo.busy} onClick={submit}>
          {ajo.busy ? "Creating…" : `Create circle (${order.length} members)`}
        </button>
        {ajo.message && <Status text={ajo.message} />}
      </div>
    </div>
  );
}

function GroupDashboard({ groupId, onBack }: { groupId: bigint; onBack: () => void }) {
  const a = useAjo(groupId);
  const g = a.group;

  if (!a.onSupportedNetwork) return <div className={card}>Switch to Sepolia to view this circle.</div>;
  if (!g) return <div className={card}>Loading circle #{groupId.toString()}…</div>;

  const round = g.currentRound;
  const recipient = round > 0n ? a.payoutOrder[Number(round) - 1] : undefined;
  const myTurn = recipient && a.address && recipient.toLowerCase() === a.address.toLowerCase();
  const iAmMember = a.payoutOrder.some(x => x.toLowerCase() === a.address?.toLowerCase());

  return (
    <div className="space-y-6">
      <button className="text-sm text-slate-500 hover:text-slate-700" onClick={onBack}>
        ← All circles
      </button>

      <div className={card}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Savings Circle #{groupId.toString()}</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${g.active ? "bg-emerald-100 text-emerald-700" : g.currentRound === 0n ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"}`}
          >
            {g.active ? "ACTIVE" : g.currentRound === 0n ? "FILLING" : "COMPLETED"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
          <Stat label="Members" value={g.memberCount.toString()} />
          <Stat label="Per round" value={`${g.contributionAmount.toString()} AJOT`} />
          <Stat label="Round" value={g.currentRound === 0n ? "—" : `${g.currentRound} of ${g.memberCount}`} />
        </div>
        {recipient && (
          <p className="mt-4 text-sm text-slate-600">
            This round’s pot goes to <span className="font-mono">{short(recipient)}</span>
            {myTurn && <span className="ml-1 font-semibold text-emerald-600">— that’s you!</span>}
          </p>
        )}
      </div>

      {/* Members + paid status */}
      <div className={card}>
        <h3 className="font-semibold">Members</h3>
        <div className="mt-3 divide-y divide-slate-100">
          {a.payoutOrder.map((m, i) => (
            <MemberRow key={m} groupId={groupId} member={m} index={i} round={round} me={a.address} />
          ))}
        </div>
      </div>

      {/* Private history — the money shot */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Your private history</h3>
          <span className="text-xs text-slate-400">only you can decrypt this</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <LockedValue title="Contributed" revealed={a.decryptedContrib} />
          <LockedValue title="Received" revealed={a.decryptedPayout} />
        </div>
        <button className={`${ghost} mt-4`} disabled={a.isRevealing} onClick={a.revealMyHistory}>
          {a.isRevealing ? "Revealing…" : a.isRevealed ? "🔓 Revealed" : "🔒 Reveal my history"}
        </button>
      </div>

      {/* Actions */}
      <div className={card}>
        <h3 className="font-semibold">Actions</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          {g.currentRound === 0n && iAmMember && (
            <button className={primary} disabled={a.busy} onClick={a.joinGroup}>
              Join this circle
            </button>
          )}
          <button className={ghost} disabled={a.busy} onClick={() => a.mintTestTokens(1000n)}>
            Mint 1000 test AJOT
          </button>
          <button className={ghost} disabled={a.busy} onClick={a.approveAjo}>
            Approve AJO
          </button>
          {g.active && (
            <button className={primary} disabled={a.busy} onClick={a.contribute}>
              Contribute {g.contributionAmount.toString()} AJOT
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          First time: <b>Mint</b> test tokens, then <b>Approve AJO</b> once, then <b>Contribute</b> each round.
        </p>
        {a.message && <Status text={a.message} />}
      </div>
    </div>
  );
}

function MemberRow({
  groupId,
  member,
  index,
  round,
  me,
}: {
  groupId: bigint;
  member: `0x${string}`;
  index: number;
  round: bigint;
  me?: string;
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
  const isMe = me && member.toLowerCase() === me.toLowerCase();
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500">
          {index + 1}
        </span>
        <span className="font-mono">{short(member)}</span>
        {isMe && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">you</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs ${joined ? "text-slate-500" : "text-amber-600"}`}>
          {joined ? "joined" : "not joined"}
        </span>
        {round > 0n &&
          (paid ? <span className="text-emerald-600">✓ paid</span> : <span className="text-slate-400">waiting</span>)}
      </div>
    </div>
  );
}

function LockedValue({ title, revealed }: { title: string; revealed?: bigint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</div>
      {revealed !== undefined ? (
        <div className="mt-1 text-2xl font-bold text-slate-900">
          {revealed.toString()} <span className="text-sm font-normal text-slate-500">AJOT</span>
        </div>
      ) : (
        <div className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-400">
          🔒 <span className="tracking-widest">••••</span>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold">{value}</div>
    </div>
  );
}

function Status({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{text}</div>;
}
