# TODO — AJO

Tracking file. Check items off as they're done. Deadline: **July 7, 2026, 23:59 AOE**.
See `CLAUDE.md` for the ground rules and `AJO PRD.md` / `AJO TRD.md` for full specs.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked / needs user input

---

## Phase 0 — Verify Zama/FHE APIs first (do BEFORE coding) ✅ DONE 2026-07-06
- [x] Confirm current `@fhevm/solidity` version + import path → **v0.11.1**, `import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";`
- [x] Confirm Sepolia config contract name → **`ZamaEthereumConfig`** (NOT `SepoliaConfig` — that name is gone in current version). `import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";` and `contract ConfidentialAjo is ZamaEthereumConfig`
- [x] Confirm `@openzeppelin/confidential-contracts` version + ERC7984 → **v0.5.1** (peer-deps `@fhevm/solidity@0.11.1` — versions aligned). `import "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";` constructor `(string name, string symbol, string contractURI)`
- [x] Confirm Solidity pragma → **`^0.8.24`** (per current template `FHECounter.sol`)
- [x] Confirm ERC7984 transfer + operator model → `confidentialTransferFrom(from, to, euint64 amount) → euint64` (also overload with `externalEuint64,inputProof`). Operator is **time-bound**: `setOperator(address operator, uint48 until)` / `isOperator(address holder, address spender) → bool`. **Member must `setOperator(ajoContract, until)` before AJO can pull funds.**
- [x] Confirm ACL signatures (all `internal`, per-euint-type, e.g. euint64): `isSenderAllowed(euint64) view → bool` · `allow(euint64, address) → euint64` · `allowThis(euint64) → euint64` · `allowTransient(euint64, address) → euint64` · `makePubliclyDecryptable(euint64) → euint64` · `fromExternal(externalEuint64, bytes inputProof) → euint64` · `select(ebool, euint64, euint64) → euint64`
- [x] Confirm frontend SDK package → **`@zama-fhe/relayer-sdk` v0.4.4** (template pins `^0.4.1`). This is the current one — NOT the older `@zama-fhe/sdk` split.
- [x] Record verified sources/versions in code comments as you go → see "Verified APIs" block in `CLAUDE.md`

### Toolchain versions confirmed from `fhevm-hardhat-template`
`@fhevm/hardhat-plugin ^0.4.2` · `@fhevm/mock-utils ^0.4.2` · `hardhat ^2.28.6` · `ethers ^6.16.0` · `encrypted-types ^0.0.4` · `typescript ^5.9.3`. Template ships **no** OpenZeppelin dep — we add `@openzeppelin/confidential-contracts@0.5.1` + `@openzeppelin/contracts` ourselves.

### ⚠️ Still to verify in-phase (don't assume now)
- Exact Relayer SDK API calls for **client-side encryption** (buffer/`createEncryptedInput`) and **user decryption** (EIP-712 `userDecrypt`) — verify against `fhevm-react-template` when we start Phase 5.
- Whether `confidentialTransferFrom` needs `FHE.allowTransient(amount, tokenAddress)` before the call — verify against an OZ ERC7984 usage example before wiring `contribute()`.

## Phase 1 — Contract scaffold (Hour 1) ✅ DONE 2026-07-06
- [x] Clone `fhevm-hardhat-template` → `contracts/`, install deps (+ `@openzeppelin/confidential-contracts@0.5.1`, `@openzeppelin/contracts`), compiles clean
- [x] `FHECounter.sol` running as pattern reference — its tests pass (3/3) on the local FHEVM mock; confirms the encrypt/decrypt loop (`fhevm.createEncryptedInput().add64().encrypt()` + `fhevm.userDecryptEuint()`)
- [x] Mintable ERC7984 test token `contracts/contracts/AjoToken.sol` — compiles + deploys locally (name "Ajo Test Token"/AJOT, public `mint(to, uint64)`)
- [x] `contracts/contracts/ConfidentialAjo.sol` skeleton — full state/events/NatSpec + function stubs (`revert("not implemented")`), compiles + deploys locally
- [x] `deploy/deploy.ts` updated to deploy both; verified on local hardhat network

### Notes for later phases
- Hardhat compiler pinned to **0.8.27** in `hardhat.config.ts`; our contracts use `pragma ^0.8.27` (ERC7984 requires it).
- Secrets use **Hardhat `vars`** not `.env`: `MNEMONIC`, `INFURA_API_KEY`, `ETHERSCAN_API_KEY` (set via `npx hardhat vars set <NAME>` before Sepolia deploy — Phase 4).
- ERC7984 `_update` handles balance ACL internally (grants recipient `FHE.allow`), so `_mint`/transfers auto-authorize the recipient to decrypt their own balance.

## Phase 2 — Core contract logic (Hours 2–3) ✅ DONE 2026-07-06 (TDD, 16 tests)
- [x] `createGroup(memberCount, contributionAmount, roundDuration, payoutOrder[], token)` — validates N≥2 and N==payoutOrder.length, records invited set, emits `GroupCreated`
- [x] `joinGroup(groupId)` — invited-only, no double-join, auto-activates + starts round 1 when full (`GroupStarted`)
- [x] `contribute(groupId, externalEuint64 amount, bytes inputProof)`:
  - [x] validate sender is member + group active + hasn't paid this round
  - [x] `FHE.fromExternal` + `FHE.isSenderAllowed`
  - [x] enforce amount == agreed amount via `FHE.eq` + `FHE.select` (no branching on ciphertext; wrong amount → encrypted 0 no-op, no revert leak)
  - [x] `confidentialTransferFrom` into escrow (`FHE.allowThis` + `FHE.allowTransient(accepted, token)`)
  - [x] set public `hasPaidThisRound` flag + `paidCount`
  - [x] update encrypted running total + `FHE.allow(total, msg.sender)`; accumulate encrypted `encPool`
  - [x] auto-calls `_tryExecutePayout` when all N have paid (payout body = Phase 3)
- [x] Local Hardhat tests (16) — incl. the confidentiality money-shot: member decrypts own history, another member **cannot**. Full suite 19/19 green.

### ⚠️ Design decisions made in Phase 2 (flag for review)
1. **`payoutOrder` addresses ARE the members** (in payout order). `joinGroup` is invite-gated to that list; `memberCount` must equal `payoutOrder.length`. Simplest coherent fixed-order ROSCA — no separate invite step.
2. **Member prerequisite:** before `contribute`, a member must `token.setOperator(ajoContract, until)` and hold a balance. The frontend must surface this as a one-time approval step.
3. **Confidentiality nuance:** `contributionAmount` is public (the agreed amount), and `contribute` enforces the encrypted input equals it. What stays private is each member's **encrypted running total** and (Phase 3) **payout amounts** — that's the demo's decrypt-your-own-history moment. If we want per-contribution amounts to be genuinely variable/secret (e.g. partial payments + encrypted shortfall per user story 7), that's a larger change — revisit if desired.

## Phase 3 — Payout + rounds (Hour 4) ✅ DONE 2026-07-06 (TDD, +5 tests → 21 total)
- [x] Auto payout trigger once all N have paid → `_tryExecutePayout` transfers `encPool` to `payoutOrder[round-1]` via `confidentialTransfer` (`allowThis` + `allowTransient(pool, token)`)
- [x] Grant recipient ACL on their payout: `encPayoutHistory[recipient] += transferred` + `FHE.allow(..., recipient)`; pool reset to fresh encrypted 0
- [x] `_advanceRound` — increments round + resets `roundStartTime`, or sets `active=false` + emits `GroupCompleted` after the final round
- [x] `advanceRoundIfReady(groupId)` — expiry-gated fallback: flags non-payers via `isDefaulted` + `MemberDefaulted`, then advances
- [x] Full round-trip test: 3-member group, 3 full rounds, each member paid exactly `3*CONTRIB` once, group completes; recipient-only decrypt enforced. **Full suite 24/24 green, clean compile.**

### ⚠️ Known MVP limitation (document in README roadmap)
- Funds escrowed in a **defaulted round are not auto-refunded** — `advanceRoundIfReady` flags + advances but leftover `encPool` stays in the contract. Fine for the happy-path demo; real refund/settlement logic is roadmap.

## Security review ✅ DONE 2026-07-06 (pre-deploy gate)
Manual review (skill needs git; did it by hand). Findings + resolutions:
- [x] **M1 Reentrancy** — token calls were before state finalization + token is caller-supplied. FIXED: added OZ `ReentrancyGuard` (`nonReentrant` on `contribute` + `advanceRoundIfReady`) and reordered `contribute` to checks-effects-interactions (paid flag/count set before the external transfer).
- [x] **L1 uint64 truncation** — FIXED: `require(contributionAmount <= type(uint64).max)` in `createGroup`.
- [ ] **M2 Underpayment griefing** (document, not code-fixed): wrong encrypted amount → `accepted=0` but member still marked paid. Faithful to PRD's select-to-zero model; frontend always sends the correct (public) amount. → README known-limitations.
- [ ] **L2 Untrusted token** (document): contract trusts the group's token to report `transferred`. → README: use the provided `AjoToken` / trusted tokens only.
- [ ] **I1 Defaulted-round funds** stuck in escrow (already noted). → README roadmap.
Regression: clean compile, 24/24 tests still green after hardening.

## Phase 4 — Deploy to Sepolia (Hour 5) ✅ DONE 2026-07-06 (deployed + verified)
- [x] Configure Sepolia RPC (keyless public `publicnode`) + deployer key via `hardhat vars set PRIVATE_KEY` (config supports PRIVATE_KEY or MNEMONIC)
- [x] Deploy `AjoToken` + `ConfidentialAjo` to Sepolia — see `DEPLOYMENTS.md`
  - ConfidentialAjo: `0x357223395518B2E1639fDb6D065Dd0a8847b9C5E`
  - AjoToken: `0xF90981C36bFE6cB6df2c0527BF6B601486F39590`
  - Deployer `0x6CcD…a5E9`; live smoke test passed (token name/symbol + groupCount read back)
- [x] Verify contracts on Etherscan — both verified (Etherscan V2 API: config uses single `apiKey` string). Source visible on the `#code` tab of each address.
- [x] Record deployed addresses → `DEPLOYMENTS.md` (README will reference in Phase 6)

## Phase 5 — Frontend (Hours 6–8) 🟡 IN PROGRESS 2026-07-06 — code written, booting/testing pending
Style: **clean light fintech** (user pick). SDK: **`@zama-fhe/react-sdk` v3 hooks** (NOT relayer-sdk 0.4 — see CLAUDE.md). Install needs `--legacy-peer-deps` (next-themes vs React 19).
- [x] Extracted `fhevm-react-template` nextjs pkg → `frontend/` (self-contained, deps installing); forced light theme; title = AJO
- [x] Generated `frontend/contracts/{ConfidentialAjo,AjoToken}.ts` from Sepolia deploy artifacts (address+abi+block); removed FHECounter demo
- [x] `hooks/useAjo.ts` — reads (groupCount/groups/payoutOrder/history handles), writes (createGroup/joinGroup/mint/approve(setOperator)/contribute w/ euint64 encrypt + 15M gas), decrypt (useUserDecrypt gated by useIsAllowed/useAllow)
- [x] `app/page.tsx` — Landing → Home (count + create/open) → CreateGroup form → GroupDashboard (config, members+paid rows, **locked history + Reveal**, actions)
- [x] **Production build passes** (`next build` exit 0). Fixes: pinned Zama SDK to exact `3.0.0` (`^3.0.0` pulled breaking 3.2.0 that dropped `RelayerWeb`/`SepoliaConfig` from root); `.npmrc` legacy-peer-deps; scaffold.config public-RPC fallback (no Alchemy key needed); euint64 decrypt→bigint cast; setOperator `until` as number (uint48); wagmiSigner address narrow. Pushed `b40d072`.
- [x] Deployed to **Vercel**: https://ajo-nu.vercel.app/ (Root dir `frontend`, auto-deploys on push) — live landing confirmed
- [ ] Live test on Sepolia: create → join → mint → approve → contribute → payout; verify Reveal decrypts own history and another wallet cannot
- [ ] Public vs private UI polish (lock chip is in; refine states)

## Phase 6 — Docs (Hour 9)
- [ ] README: problem statement, architecture diagram, ACL/confidentiality model, setup/deploy steps, deployed Sepolia address, limitations/roadmap
- [ ] NatSpec on all public/external contract functions (esp. ACL grants)

## Phase 7 — Video + submit (Hour 10 + buffer)
- [ ] Record 3-min pitch — **real person, real voice** (no AI video/voice)
  - 0:00–0:30 problem · 0:30–1:00 global scale · 1:00–2:15 live demo · 2:15–3:00 architecture + roadmap
- [ ] Demo proof: Wallet A decrypts own history, Wallet B cannot see A's amounts
- [ ] GitHub repo public + README complete
- [ ] Frontend deployed (Vercel/Netlify) or clear local run instructions
- [ ] Submit via Zama Developer Hub before deadline (submit EARLY)
- [ ] Share on X tagging @zama with #ZamaDeveloperProgram

---

## Blockers / open questions for the user
- (none yet — add here whenever a Zama API is ambiguous and needs a decision)
