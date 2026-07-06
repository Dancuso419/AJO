# PRD: Confidential Ajo — Private Rotating Savings Circle
**Zama Developer Program — Mainnet Season 3, Builder Track**
**Deadline: July 7, 2026, 23:59 AOE**

---

## 1. Problem Statement

Rotating Savings and Credit Associations (ROSCAs) — known as Ajo/Esusu (Nigeria/West Africa), Susu (Ghana), Chama (Kenya), Chit funds (India), Tanda (Mexico), Hui (China), Paluwagan (Philippines), etc. — are used by well over a billion people globally as an informal savings/credit mechanism. Members contribute a fixed amount each round; one member receives the full pooled amount per round, rotating until everyone has received a payout once.

Two problems plague these systems today:
1. **Trust/fraud risk**: a human collector can under-report contributions, skip payouts, or abscond with funds. No enforcement or dispute resolution exists.
2. **Privacy loss when digitized**: naive on-chain implementations expose every member's exact contribution and payout amount to the whole group and the public — a dealbreaker for many users who'd otherwise want the trustlessness of a smart contract.

**Confidential Ajo** solves both: payouts and contributions are enforced automatically on-chain (fixing trust), while individual amounts stay encrypted via Zama's FHEVM (fixing privacy) — solving a problem a standard public smart contract cannot.

---

## 2. Goals (MVP scope for this submission)

- Deploy a working confidential ROSCA smart contract to **Ethereum Sepolia testnet**
- Frontend where a user can: create a group, join a group, contribute per round, see their own encrypted balance/history (and only their own), and see the round's payout execute
- Clear docs (README) explaining the confidentiality model
- 3-minute video pitch (real person, real voice — per Zama's Builder Track rules, no AI-generated video/voice)

## 3. Non-Goals (explicitly cut for time — call these out as "roadmap" in docs)

- Randomized/bid-based payout order (ship fixed order only)
- Multi-group factory UI polish (a single deployed group instance, or a minimal factory if time allows)
- Automatic round-timing/cron (manual "advance round" trigger is fine)
- Cross-chain support
- Mobile app

---

## 4. User Stories

1. As an **organizer**, I can create a group specifying: number of members (N), contribution amount, round length, and payout order (list of addresses).
2. As a **member**, I can join a group (until it reaches N members).
3. As a **member**, I can contribute my round's amount in confidential tokens; other members cannot see my exact contribution amount, only that I *did* contribute (a public boolean/flag).
4. As a **member**, once all N members have contributed for the round, the designated recipient for that round automatically receives the pooled amount, encrypted, decryptable only by them.
5. As a **member**, I can decrypt and view my own historical contributions and payouts via my wallet signature — no one else can.
6. As anyone, I can see group-level public metadata (which round we're on, who has/hasn't paid this round, total group size) without seeing amounts.
7. As an **organizer**, if a member misses a round, they are flagged as defaulted (this status is intentionally public — accountability, not privacy, is the point here), while the exact shortfall amount stays encrypted.

---

## 5. Technical Architecture

### 5.1 Confirmed dependencies (verified against current Zama docs/GitHub — do not substitute other package names)

**Contracts:**
- `@fhevm/solidity` — the FHE Solidity library (`import "@fhevm/solidity/lib/FHE.sol"`)
- `@fhevm/solidity/config/ZamaConfig.sol` — provides `SepoliaConfig` (inherit this in the main contract for Sepolia deployment; there's also `ZamaEthereumConfig` for mainnet)
- `@openzeppelin/confidential-contracts` — provides `ERC7984` (confidential fungible token standard), `ERC7984ERC20Wrapper` (wraps a plain ERC-20 into a confidential token), `ERC7984Votes`, confidential vesting wallets
- `@openzeppelin/contracts` — standard OZ contracts (Ownable2Step, IERC20, SafeERC20, etc.)
- Solidity version: `^0.8.27` (per current OpenZeppelin confidential-contracts examples) — use `^0.8.24` minimum if needed for compatibility with older FHE examples
- Base scaffold: fork **`zama-ai/fhevm-hardhat-template`** (GitHub) — comes pre-wired with Hardhat, FHEVM plugin, deploy scripts, and a working example contract (`FHECounter.sol`) to reference for patterns

**Frontend:**
- `@zama-fhe/relayer-sdk` (or `@zama-fhe/sdk` + `@zama-fhe/react-sdk` per the newer `fhevm-react-template`) — handles encrypting user inputs client-side, generating input proofs, and performing "user decryption" (EIP-712 signature-based decryption of values the user is authorized to see)
- Reference scaffold: **`zama-ai/fhevm-react-template`** (GitHub) — Next.js 15 + React 19 + wagmi + viem + RainbowKit + Tailwind/daisyUI, already wired to a relayer (`RelayerWeb` for Sepolia)
- Wallet connection: RainbowKit/wagmi (from the template) or a simpler ethers.js + MetaMask setup if time-constrained

### 5.2 Core FHEVM concepts the contract must use correctly

- **Encrypted types**: `euint64` for contribution/payout amounts, `ebool` for internal comparisons, `externalEuint64` for encrypted user inputs coming from the frontend (paired with an `inputProof`)
- **ACL (Access Control List)** — this is the mechanism that makes confidentiality actually work:
  - `FHE.allowThis(value)` — lets the contract itself keep operating on a ciphertext in future transactions
  - `FHE.allow(value, address)` — grants a specific address (e.g., the contributing member) permanent decryption rights on their own ciphertext
  - `FHE.allowTransient(value, address)` — temporary access scoped to the current transaction (e.g., when calling into the confidential token contract)
  - `FHE.isSenderAllowed(value)` — **must** be checked before operating on any externally-supplied ciphertext, or the contract is vulnerable to inference attacks
  - `FHE.makePubliclyDecryptable(value)` — only for values that are genuinely meant to be public (e.g., NOT used for individual amounts in this app)
- **Casting**: `FHE.asEuint64(plaintext)` to bring a plaintext constant into encrypted form; `FHE.fromExternal(externalEuint64, inputProof)` to validate and convert a user-submitted encrypted input
- **Arithmetic on ciphertexts**: `FHE.add`, `FHE.sub`, `FHE.select` (encrypted ternary — critical for "only transfer if condition met" logic without branching, since you can't `if` on encrypted booleans directly)
- **Decryption flow** (two valid patterns — pick based on need):
  1. **User decryption** (client-side, via Relayer SDK): a member decrypts their *own* balance/history off-chain using an EIP-712 signature. No on-chain callback needed. Use this for "member views their own contribution/payout history."
  2. **On-chain requested decryption** (`FHE.requestDecryption(ctsHandles, callbackSelector)`): async, contract-initiated, relayer + KMS fulfill it and call back into the contract with a proof (`FHE.checkSignatures`). Use this only if the contract itself needs a decrypted value to make a decision (e.g., if you wanted an on-chain-verified default check — likely NOT needed for MVP since default detection can be simpler: just track a public "paid this round" boolean per member).

### 5.3 Contract design

**Recommend two contracts:**

1. **`ConfidentialAjo.sol`** (core logic) — the group/round/payout state machine
2. Use an existing **ERC7984** confidential token for the actual money movement — either:
   - Deploy `ERC7984ERC20Wrapper` wrapping Sepolia test USDC/a mock ERC-20 (lets you demo "wrap your test tokens into confidential tokens, then join the Ajo"), or
   - For speed, deploy a minimal custom `ERC7984`-based test token you mint freely for demo purposes (faster to demo than sourcing/wrapping a real Sepolia ERC-20)

**`ConfidentialAjo.sol` — suggested state & functions:**

```solidity
struct Group {
    uint256 memberCount;          // N
    uint256 contributionAmount;   // agreed plaintext amount (public — the AGREED amount is not secret, only actual balances/payouts are)
    uint256 roundDuration;        // seconds
    uint256 currentRound;         // 1-indexed
    uint256 roundStartTime;
    address[] payoutOrder;        // fixed order, public
    address token;                // ERC7984 confidential token address
    bool active;
}

mapping(uint256 => Group) public groups;
mapping(uint256 => mapping(address => bool)) public isMember;
mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasPaidThisRound; // groupId => round => member => paid?
mapping(uint256 => mapping(address => euint64)) private encryptedContributionHistory; // per member, accumulator they can decrypt
mapping(uint256 => mapping(address => euint64)) private encryptedPayoutHistory;

function createGroup(uint256 memberCount, uint256 contributionAmount, uint256 roundDuration, address[] calldata payoutOrder, address token) external returns (uint256 groupId);
function joinGroup(uint256 groupId) external;
function contribute(uint256 groupId, externalEuint64 encryptedAmount, bytes calldata inputProof) external;
function _tryExecutePayout(uint256 groupId) internal; // called automatically once all members have paid for the round
function advanceRoundIfReady(uint256 groupId) external; // manual trigger if auto-check isn't wired everywhere
function getMyEncryptedContributionHistory(uint256 groupId) external view returns (euint64); // caller must be allowed via ACL to decrypt client-side
```

**Key confidentiality logic for `contribute()`:**
1. Validate sender is a group member and hasn't paid this round (`require`)
2. `FHE.fromExternal` the input amount, validate with `FHE.isSenderAllowed`
3. Use `FHE.select` to enforce the contribution equals the agreed amount without branching on encrypted data (e.g., compare encrypted amount to the known plaintext `contributionAmount` cast via `FHE.asEuint64`, and only accept/transfer if equal — if not equal, treat as a no-op contribution so it doesn't revert and leak info via gas/revert side channels)
4. Call into the ERC7984 token's `confidentialTransferFrom` to actually move funds into escrow (needs `FHE.allowTransient` for the token contract to access the amount handle)
5. Update `hasPaidThisRound[groupId][round][msg.sender] = true` (public flag, this is fine/intended)
6. Update the member's encrypted running contribution total; grant them ACL access (`FHE.allow(newTotal, msg.sender)`) so only they can ever decrypt their own history
7. If all N members have paid → trigger payout to `payoutOrder[currentRound - 1]`, transfer pooled confidential balance to them, grant them ACL access to their payout amount, advance `currentRound`

---

## 6. Frontend Requirements

- Wallet connect (RainbowKit/wagmi from template, or minimal ethers+MetaMask)
- **Create Group** form: member count, contribution amount, round duration, payout order (list of addresses)
- **Join Group** flow: browse open groups, join
- **Contribute** flow: encrypt amount client-side via Relayer SDK, submit with input proof
- **My Group Dashboard**: current round, who has/hasn't paid (public), "your turn" indicator based on payout order
- **My History** (private): decrypt-and-display the caller's own encrypted contribution/payout totals using the Relayer SDK's user-decryption (EIP-712 signature flow) — this is the money shot for the demo video: show that only the connected wallet can reveal its own numbers, while another wallet gets nothing
- Clear UI treatment distinguishing "public info" (round #, who paid, group size) from "private info" (amounts) — e.g., a lock icon or blurred placeholder until the user explicitly decrypts

---

## 7. Documentation Deliverables

- `README.md`: problem statement (ROSCA fraud + privacy), architecture diagram, how confidentiality is enforced (ACL model), setup/deploy instructions, deployed Sepolia contract address, known limitations/roadmap (randomized order, multi-token support, etc.)
- Inline NatSpec comments on all public/external contract functions, especially around ACL grants (reviewers will specifically check that ACL usage is correct and intentional)

---

## 8. Video Pitch (3 min) — Suggested Structure

1. **0:00–0:30** — The problem: real-world ROSCA fraud/trust issues + why people avoid formalizing them (privacy)
2. **0:30–1:00** — Show global scale (Ajo, Susu, Chama, chit funds, tanda, hui — "over a billion people already do this manually")
3. **1:00–2:15** — Live demo: create group → two wallets join → both contribute → payout executes → show Wallet A can decrypt its own history, Wallet B cannot see Wallet A's amounts
4. **2:15–3:00** — Architecture recap (FHEVM + ERC-7984 + ACL) and roadmap (randomized order, cross-chain, mobile)
- **Must be a real person's face/voice** — no AI-generated video or voiceover, per Zama's explicit rule

---

## 9. Timeline (given ~1 day remaining)

| Time block | Task |
|---|---|
| Hour 1 | Fork `fhevm-hardhat-template`, scaffold `ConfidentialAjo.sol`, deploy a test ERC7984 token locally |
| Hour 2–3 | Implement `createGroup`, `joinGroup`, `contribute` with correct ACL logic; local Hardhat tests |
| Hour 4 | Implement payout trigger logic + round advancement; test full round-trip locally |
| Hour 5 | Deploy to Sepolia; verify on Etherscan |
| Hour 6–7 | Fork `fhevm-react-template`, wire up Create/Join/Contribute UI + wallet connect |
| Hour 8 | Wire up user-decryption flow for "My History" (the key confidentiality demo moment) |
| Hour 9 | Write README/docs |
| Hour 10 | Record video pitch |
| Buffer | Submit early — don't wait until 23:59 AOE given inevitable last-minute issues |

---

## 10. Submission Checklist

- [ ] Contract deployed and verified on Sepolia
- [ ] Frontend deployed (Vercel/Netlify) or clear local run instructions
- [ ] GitHub repo public, README complete
- [ ] 3-minute video (real person/voice), uploaded per submission instructions
- [ ] Submitted via Zama Developer Hub before July 7, 23:59 AOE
- [ ] Shared on X tagging @zama with #ZamaDeveloperProgram (per program guidelines)

---

## 11. Open Risks / Things to Verify with Claude Code During Build

- Confirm current exact npm versions of `@fhevm/solidity`, `@openzeppelin/confidential-contracts`, and `@zama-fhe/relayer-sdk` at install time (fast-moving libraries — pin versions once confirmed working)
- Confirm whether `SepoliaConfig` vs `ZamaEthereumConfig` is the correct inherited config for Sepolia in the current library version (docs reference both across versions)
- Confirm the ERC7984 `confidentialTransferFrom` operator/allowance model (may need the caller to be set as an "operator" on the token before the Ajo contract can pull funds — check `isOperator`/`setOperator` in ERC7984)
- Test gas costs of FHE operations on Sepolia (FHE ops are much more expensive than plaintext ops — this affects how big a group size is practically demoable)
