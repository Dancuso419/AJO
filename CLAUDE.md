# CLAUDE.md — AJO

Project guidance for Claude Code. Read this before doing any work in this repo.

**Project name: AJO** (not "Confidential Ajo" — "AJO" is the product name; "confidential" only ever describes the mechanism, never the name).

## What we're building

**AJO** — a private, on-chain Rotating Savings and Credit Association (ROSCA / Ajo / Esusu / Susu / Chama / Tanda / Hui).

Members each contribute a fixed amount per round; one member receives the whole pooled amount per round, rotating until everyone has been paid once.

It solves two problems a normal public smart contract cannot solve at the same time:
1. **Trust/fraud** — contributions and payouts are enforced automatically on-chain. No human collector can misreport, skip, or abscond.
2. **Privacy** — individual contribution/payout **amounts stay encrypted** via Zama's FHEVM. The group and the public only see public status flags (current round, who has/hasn't paid, who defaulted), never the amounts.

**Submission:** Zama Developer Program — Mainnet Season 3, Builder Track. **Deadline: July 7, 2026, 23:59 AOE.**

See `AJO PRD.md` (product spec) and `AJO TRD.md` (technical spec) for full detail. `TODO.md` tracks progress — keep it updated.

## ⚠️ CRITICAL GROUND RULE — verify before writing any Zama/FHE code

**Do NOT assume any API, function signature, import path, package name, package version, contract inheritance pattern, or SDK behavior from training data or memory.** FHEVM/Zama libraries change frequently; outdated assumptions WILL produce broken code.

Before writing/modifying any code touching Zama / FHEVM / OpenZeppelin confidential-contracts APIs, you MUST:
1. Check the current source of truth first:
   - https://docs.zama.org (Solidity Guides, Protocol docs, Examples)
   - https://github.com/zama-ai (esp. `fhevm`, `fhevm-hardhat-template`, `fhevm-react-template`)
   - https://github.com/OpenZeppelin/openzeppelin-confidential-contracts
   - https://docs.openzeppelin.com/confidential-contracts
2. If something is ambiguous, versioned differently across docs, or unconfirmed by the above — **STOP and ASK the user.** Do not guess, do not "best-effort" fill the gap, do not silently pick one interpretation.
3. When you confirm something, **note which source/version** you confirmed it against (code comment or commit message).
4. In each response, **flag which parts you verified and which you're still uncertain about.**

This applies to: import paths, config contract names (`SepoliaConfig` vs `ZamaEthereumConfig`), encrypted type behavior, ACL functions (`FHE.allow`, `FHE.allowThis`, `FHE.allowTransient`, `FHE.isSenderAllowed`, `FHE.makePubliclyDecryptable`), decryption flows (user decryption via Relayer SDK vs `FHE.requestDecryption` on-chain callback), ERC7984 signatures (`confidentialTransfer`, `confidentialTransferFrom`, operator model), npm package names/versions, and Hardhat/Foundry config.

## Verified APIs (confirmed 2026-07-06 against live sources — safe to use)

Pinned versions (all cross-compatible; `confidential-contracts@0.5.1` peer-deps `@fhevm/solidity@0.11.1`):

| Package | Version | Source |
|---|---|---|
| `@fhevm/solidity` | `0.11.1` | npm registry + jsdelivr source |
| `@openzeppelin/confidential-contracts` | `0.5.1` | npm registry (peerDep `@fhevm/solidity@0.11.1`) |
| `@zama-fhe/relayer-sdk` | `0.4.4` (template pins `^0.4.1`) | npm registry + template |
| `@fhevm/hardhat-plugin` | `^0.4.2` | `fhevm-hardhat-template/package.json` |
| `hardhat` / `ethers` | `^2.28.6` / `^6.16.0` | same |

**Contract header (from current `FHECounter.sol`):**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
contract ConfidentialAjo is ZamaEthereumConfig { ... }
```
> ⚠️ Sepolia config is **`ZamaEthereumConfig`**, NOT `SepoliaConfig`. The PRD/TRD's `SepoliaConfig` guess is outdated — do not use it.

**FHE functions (all `internal`, one overload per euint type — shown for `euint64`), from `FHE.sol@0.11.1` source:**
- `FHE.fromExternal(externalEuint64 handle, bytes inputProof) → euint64`
- `FHE.isSenderAllowed(euint64 value) view → bool`
- `FHE.allow(euint64 value, address account) → euint64`
- `FHE.allowThis(euint64 value) → euint64`
- `FHE.allowTransient(euint64 value, address account) → euint64`
- `FHE.makePubliclyDecryptable(euint64 value) → euint64`
- `FHE.select(ebool control, euint64 a, euint64 b) → euint64`

**ERC7984 (OpenZeppelin confidential-contracts@0.5.1):**
```solidity
import "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
// constructor(string name, string symbol, string contractURI)
```
- `confidentialTransferFrom(address from, address to, euint64 amount) → euint64` (+ overload `(from, to, externalEuint64, bytes inputProof)`)
- `confidentialTransfer(address to, euint64 amount) → euint64` (+ external-input overload)
- Operator model is **time-bounded**: `setOperator(address operator, uint48 until)` / `isOperator(address holder, address spender) → bool`. A member must call `setOperator(ajoContract, until)` before AJO can pull their funds via `confidentialTransferFrom`.

**Frontend SDK (verified 2026-07-06 against current `fhevm-react-template`):** the web app uses the **v3 SDK line**, NOT relayer-sdk 0.4 (that's Hardhat-tests only):
- `@zama-fhe/react-sdk` `^3.2.0` (React hooks) + peer `@zama-fhe/sdk` `^3.2.0`, with `wagmi >=2`, `viem >=2`, `@tanstack/react-query >=5`, RainbowKit, Next 15 / React 19.
- Encryption: `useEncrypt()` → `encrypt.mutateAsync({ values: [{ value: BigInt(v), type: "euint64" }], contractAddress, userAddress })` → returns `{ handles, inputProof }`; pass `bytesToHex(handles[0])`, `bytesToHex(inputProof)` to the contract call.
- User-decryption: `useUserDecrypt({ handles }, { enabled })`; ACL grant helper `useAllow()`, check `useIsAllowed()`. The hooks internally do keypair gen + EIP-712 signing.
- `FHE.allowTransient(amount, token)` before `confidentialTransferFrom`: **verified required** (done in `contribute`/`_tryExecutePayout`).

## Tech stack (verify every item before use)

**Contracts**
- Base scaffold: fork `zama-ai/fhevm-hardhat-template`
- `@fhevm/solidity` — FHE Solidity library
- `@openzeppelin/confidential-contracts` — ERC7984 confidential token + ERC7984ERC20Wrapper
- `@openzeppelin/contracts` — Ownable2Step, IERC20, etc.
- Deploy target: **Ethereum Sepolia testnet**

**Frontend**
- Base scaffold: fork `zama-ai/fhevm-react-template` (Next.js / React / wagmi / viem / RainbowKit / Tailwind)
- Zama Relayer/encryption SDK (confirm current package name — `@zama-fhe/relayer-sdk` vs `@zama-fhe/sdk` + `@zama-fhe/react-sdk`)

## Architecture summary

- **`ConfidentialAjo.sol`** — group/round/payout state machine.
- An **ERC7984** confidential token for the actual money movement (wrap a test ERC-20, or deploy a simple mintable ERC7984 test token for demo speed).
- **ACL is the confidentiality mechanism.** `FHE.allow(value, member)` grants each member permanent decrypt rights to *their own* ciphertext; nobody else can decrypt it. Reviewers will specifically check ACL usage is correct and intentional.
- **Amounts are encrypted (`euint64`); status flags are public** (who paid, current round, defaults). This split is intentional — accountability is public, amounts are private.
- **Two decryption patterns:** (1) user decryption client-side via Relayer SDK + EIP-712 signature — use for "member views own history"; (2) on-chain `FHE.requestDecryption` callback — only if the contract itself needs a plaintext to decide (likely NOT needed for MVP).

## MVP scope (IN)
- Confidential ROSCA contract deployed + verified on Sepolia
- Frontend: create group, join group, contribute per round, view own encrypted history (decryptable only by owner)
- README documenting the confidentiality/ACL model
- 3-min video pitch — **real person, real voice, no AI-generated video/voice** (Zama Builder Track rule)

## Out of scope (roadmap in docs — do not build)
- Randomized/bid-based payout order (fixed order only)
- Polished multi-group factory UI
- Automated round-timing/cron (manual "advance round" trigger is fine)
- Cross-chain support
- Mobile app

## The demo money-shot (keep this working)
Wallet A can decrypt its own contribution/payout history; Wallet B connected to the same group **cannot** see Wallet A's amounts. This is the core thing the video must show — don't regress it.

## Working conventions
- Keep `TODO.md` current as tasks complete.
- Prefer the fastest demoable path — this is a time-boxed hackathon. When in doubt, ship the simpler option and note the shortcut as roadmap.
- FHE ops are expensive on Sepolia; keep demo group sizes small.
- NatSpec on all public/external contract functions, especially around ACL grants.

## Use skills — invoke them when the situation matches

Skills are specialized workflows. **If a skill applies to the task, use it — this is not optional.** Announce "Using [skill] to [purpose]" and follow it. When multiple apply, process skills (brainstorming, debugging, planning) run first and set the approach; implementation skills (frontend design, output) carry it out.

Trigger map for this project:

| When you're about to... | Invoke |
|---|---|
| Build/design a new feature or component, or the user says "let's build X" | `brainstorming` FIRST, then plan/implement |
| Turn a spec/requirements into a step-by-step plan | `writing-plans` |
| Execute a written plan with review checkpoints | `executing-plans` |
| Implement any contract function or frontend feature | `test-driven-development` (write the failing test first) |
| Hit a bug, failing test, or unexpected FHE/contract behavior | `systematic-debugging` FIRST, before proposing fixes |
| Build/polish the frontend UI (dashboard, forms, history view) | a frontend design skill — `impeccable` or `taste-skill` |
| Generate long/exhaustive code without truncation or placeholders | `output-skill` |
| Finish a feature / before claiming it works | `verification-before-completion` (run it, show evidence) |
| Want the work reviewed before merge/submit | `requesting-code-review` |
| Receive review feedback | `receiving-code-review` |
| **Before deploying the contract to Sepolia** | `security-review` — smart contract holds funds + ACL correctness is critical |
| Wrap up a branch / decide merge vs PR | `finishing-a-development-branch` |

Notes:
- The **skill check comes before** clarifying questions or exploring files — check first, then act.
- Skills evolve; read the current version each time rather than relying on memory of it.
- Given the fund-holding + confidentiality nature of this contract, treat `security-review` (ACL grants, escrow logic, side-channel leaks) as a hard gate before Sepolia deploy — not optional polish.
- User instructions and this CLAUDE.md take precedence over a skill if they ever conflict.
