"use client";

import { useCallback, useMemo, useState } from "react";
import { useAllow, useEncrypt, useIsAllowed, useUserDecrypt } from "@zama-fhe/react-sdk";
import { ZERO_HANDLE } from "@zama-fhe/sdk";
import { bytesToHex } from "viem";
import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";
import { AjoToken } from "~~/contracts/AjoToken";
import { ConfidentialAjo } from "~~/contracts/ConfidentialAjo";
import { deploymentFor } from "~~/utils/contract";

// Operator approval validity (uint48 unix seconds) — year 2100. uint48 → number in viem.
const OPERATOR_UNTIL = 4102444800;
// FHE ops are gas-heavy; keep below Sepolia's block gas limit.
const FHE_GAS = 15_000_000n;

export type GroupInfo = {
  memberCount: bigint;
  contributionAmount: bigint;
  roundDuration: bigint;
  currentRound: bigint;
  roundStartTime: bigint;
  token: `0x${string}`;
  active: boolean;
};

/** Everything the AJO UI needs for one selected group id. */
export const useAjo = (groupId: bigint | undefined) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const ajo = useMemo(() => deploymentFor(ConfidentialAjo, chainId), [chainId]);
  const token = useMemo(() => deploymentFor(AjoToken, chainId), [chainId]);

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const { writeContractAsync } = useWriteContract();
  const encrypt = useEncrypt();

  const ajoAddr = ajo?.address as `0x${string}` | undefined;
  const tokenAddr = token?.address as `0x${string}` | undefined;
  const hasGroup = groupId !== undefined;

  // ---- Reads -------------------------------------------------------------

  const groupCountQ = useReadContract({
    address: ajoAddr,
    abi: ajo?.abi,
    functionName: "groupCount",
    query: { enabled: Boolean(ajoAddr && isConnected) },
  });

  const groupQ = useReadContract({
    address: ajoAddr,
    abi: ajo?.abi,
    functionName: "groups",
    args: hasGroup ? [groupId!] : undefined,
    query: { enabled: Boolean(ajoAddr && isConnected && hasGroup) },
  });

  const payoutOrderQ = useReadContract({
    address: ajoAddr,
    abi: ajo?.abi,
    functionName: "getPayoutOrder",
    args: hasGroup ? [groupId!] : undefined,
    query: { enabled: Boolean(ajoAddr && isConnected && hasGroup) },
  });

  const group: GroupInfo | undefined = useMemo(() => {
    const d = groupQ.data as readonly unknown[] | undefined;
    if (!d) return undefined;
    return {
      memberCount: d[0] as bigint,
      contributionAmount: d[1] as bigint,
      roundDuration: d[2] as bigint,
      currentRound: d[3] as bigint,
      roundStartTime: d[4] as bigint,
      token: d[5] as `0x${string}`,
      active: d[6] as boolean,
    };
  }, [groupQ.data]);

  const payoutOrder = useMemo(() => (payoutOrderQ.data as `0x${string}`[] | undefined) ?? [], [payoutOrderQ.data]);

  const refresh = useCallback(() => {
    groupCountQ.refetch();
    groupQ.refetch();
    payoutOrderQ.refetch();
  }, [groupCountQ, groupQ, payoutOrderQ]);

  // ---- Encrypted history + decryption -----------------------------------

  const contribHandleQ = useReadContract({
    address: ajoAddr,
    abi: ajo?.abi,
    functionName: "getMyEncryptedContributionHistory",
    args: hasGroup ? [groupId!] : undefined,
    account: address,
    query: { enabled: Boolean(ajoAddr && isConnected && hasGroup && address) },
  });
  const payoutHandleQ = useReadContract({
    address: ajoAddr,
    abi: ajo?.abi,
    functionName: "getMyEncryptedPayoutHistory",
    args: hasGroup ? [groupId!] : undefined,
    account: address,
    query: { enabled: Boolean(ajoAddr && isConnected && hasGroup && address) },
  });

  const contribHandle = contribHandleQ.data as `0x${string}` | undefined;
  const payoutHandle = payoutHandleQ.data as `0x${string}` | undefined;

  const decryptHandles = useMemo(() => {
    if (!ajoAddr) return [];
    const list: { handle: `0x${string}`; contractAddress: `0x${string}` }[] = [];
    if (contribHandle && contribHandle !== ZERO_HANDLE) list.push({ handle: contribHandle, contractAddress: ajoAddr });
    if (payoutHandle && payoutHandle !== ZERO_HANDLE) list.push({ handle: payoutHandle, contractAddress: ajoAddr });
    return list;
  }, [ajoAddr, contribHandle, payoutHandle]);

  const { mutate: allow, isPending: isAllowing } = useAllow();
  const { data: isAllowed } = useIsAllowed({ contractAddresses: [ajoAddr ?? "0x0"] });
  const [revealEnabled, setRevealEnabled] = useState(false);
  const decrypt = useUserDecrypt({ handles: decryptHandles }, { enabled: revealEnabled && !!isAllowed });

  const decryptedContrib = useMemo(() => {
    if (!contribHandle) return undefined;
    if (contribHandle === ZERO_HANDLE) return 0n;
    return decrypt.data?.[contribHandle] as bigint | undefined;
  }, [contribHandle, decrypt.data]);
  const decryptedPayout = useMemo(() => {
    if (!payoutHandle) return undefined;
    if (payoutHandle === ZERO_HANDLE) return 0n;
    return decrypt.data?.[payoutHandle] as bigint | undefined;
  }, [payoutHandle, decrypt.data]);

  const isRevealed = decryptedContrib !== undefined || decryptedPayout !== undefined;
  const isRevealing = decrypt.isFetching || isAllowing;

  const revealMyHistory = useCallback(() => {
    if (!ajoAddr) return;
    setRevealEnabled(true);
    if (!isAllowed) {
      setMessage("Authorizing decryption (sign in your wallet)…");
      allow([ajoAddr]);
    } else {
      setMessage("Revealing your history…");
    }
  }, [ajoAddr, isAllowed, allow]);

  // ---- Writes ------------------------------------------------------------

  const run = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    setMessage(`${label}…`);
    try {
      await fn();
      setMessage(`${label} — done ✓`);
      return true;
    } catch (e) {
      setMessage(`${label} failed: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const createGroup = useCallback(
    async (memberCount: bigint, contributionAmount: bigint, roundDuration: bigint, order: `0x${string}`[]) => {
      if (!ajoAddr || !tokenAddr) return false;
      const ok = await run("Creating circle", () =>
        writeContractAsync({
          address: ajoAddr,
          abi: ajo!.abi,
          functionName: "createGroup",
          args: [memberCount, contributionAmount, roundDuration, order, tokenAddr],
        }),
      );
      if (ok) refresh();
      return ok;
    },
    [ajoAddr, tokenAddr, ajo, writeContractAsync, run, refresh],
  );

  const joinGroup = useCallback(async () => {
    if (!ajoAddr || !hasGroup) return false;
    const ok = await run("Joining circle", () =>
      writeContractAsync({ address: ajoAddr, abi: ajo!.abi, functionName: "joinGroup", args: [groupId!] }),
    );
    if (ok) refresh();
    return ok;
  }, [ajoAddr, ajo, hasGroup, groupId, writeContractAsync, run, refresh]);

  const mintTestTokens = useCallback(
    async (amount: bigint) => {
      if (!tokenAddr || !address) return false;
      return run("Minting test AJOT", () =>
        writeContractAsync({ address: tokenAddr, abi: token!.abi, functionName: "mint", args: [address, amount] }),
      );
    },
    [tokenAddr, token, address, writeContractAsync, run],
  );

  const approveAjo = useCallback(async () => {
    if (!tokenAddr || !ajoAddr) return false;
    return run("Approving AJO to move your tokens", () =>
      writeContractAsync({
        address: tokenAddr,
        abi: token!.abi,
        functionName: "setOperator",
        args: [ajoAddr, OPERATOR_UNTIL],
      }),
    );
  }, [tokenAddr, ajoAddr, token, writeContractAsync, run]);

  const contribute = useCallback(async () => {
    if (!ajoAddr || !hasGroup || !address || !group) return false;
    setBusy(true);
    setMessage("Encrypting your contribution…");
    try {
      const enc = await encrypt.mutateAsync({
        values: [{ value: group.contributionAmount, type: "euint64" }],
        contractAddress: ajoAddr,
        userAddress: address,
      });
      setMessage("Sending contribution…");
      await writeContractAsync({
        address: ajoAddr,
        abi: ajo!.abi,
        functionName: "contribute",
        args: [groupId!, bytesToHex(enc.handles[0]!), bytesToHex(enc.inputProof)],
        gas: FHE_GAS,
      });
      setMessage("Contribution sent ✓");
      refresh();
      return true;
    } catch (e) {
      setMessage(`Contribute failed: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
      return false;
    } finally {
      setBusy(false);
    }
  }, [ajoAddr, ajo, hasGroup, groupId, address, group, encrypt, writeContractAsync, refresh]);

  return {
    address,
    isConnected,
    ajoAddress: ajoAddr,
    tokenAddress: tokenAddr,
    onSupportedNetwork: Boolean(ajoAddr && tokenAddr),
    groupCount: (groupCountQ.data as bigint | undefined) ?? 0n,
    group,
    payoutOrder,
    refresh,
    // history / decryption
    contribHandle,
    payoutHandle,
    decryptedContrib,
    decryptedPayout,
    isRevealed,
    isRevealing,
    revealMyHistory,
    // writes
    busy,
    message,
    createGroup,
    joinGroup,
    mintTestTokens,
    approveAjo,
    contribute,
  };
};
