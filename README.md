# AJO — Private Rotating Savings Circle

> **Zama Developer Program — Mainnet Season 3 Hackathon Submission**

AJO brings the traditional West African *ajo* (also called *esusu*, *susu*, *chit fund*, or ROSCA — Rotating Savings and Credit Association) on-chain with full financial privacy using [Zama FHEVM](https://www.zama.ai/fhevm).

Over 1 billion people worldwide use informal savings circles. The amount each person contributes — and receives — is deeply personal. On a public blockchain, those numbers are exposed to every participant, every observer, and every future employer or adversary who reads the chain. **AJO encrypts that data using Fully Homomorphic Encryption so only you can see your own amounts, while enforcement remains automatic and trust-minimized on-chain.**

**Live app:** https://ajo-nu.vercel.app/

---

## How It Works

A rotating savings circle is simple:

1. **N people** agree to each contribute a fixed amount every round.
2. **Each round**, everyone pays in. The full pool goes to one person.
3. The payout **rotates** until everyone has received the pot once.

With 5 people each contributing 100 AJOT, every round produces a 500-token payout. After 5 rounds, everyone has paid in 500 total and received 500 total — net zero, but each person got a large lump sum they couldn't have saved alone.

**What AJO adds:**

- **Encrypted amounts** — your contribution total and payout total live on-chain as FHE ciphertexts. Nobody — not other members, not the contract owner, not a blockchain explorer — can see your numbers without your cryptographic key.
- **Automatic enforcement** — the smart contract handles contributions, escrow, and payouts without a trusted middleman.
- **Default protection** — if a member misses a round, they are flagged publicly and the group moves on. The organiser never needs to chase anyone.

---

## Confidentiality Model

AJO uses [Zama FHEVM](https://github.com/zama-ai/fhevm) to keep financial amounts private while keeping status flags public.

### What stays PUBLIC (by design)

| Data | Why public |
|---|---|
| Group configuration (member count, agreed amount, round duration) | Set by the organiser, known to all members |
| Payout order | All members agree upfront |
| Who has paid this round (`hasPaidThisRound`) | Social accountability — the whole point of a savings circle |
| Payment counts and default flags | Needed to advance rounds without a trusted operator |

### What stays PRIVATE (FHE-encrypted)

| Data | Who can decrypt |
|---|---|
| Each member's running contribution total | Only that member |
| Each member's running payout total | Only that member |
| The escrowed pool mid-round | Nobody until payout (the contract holds it as a ciphertext) |

### How the ACL works

Zama FHEVM uses an Access Control List (ACL) to control who can decrypt each ciphertext. Every `euint64` value carries a per-handle permission set.

```
Member contributes → FHE.fromExternal(encryptedAmount, inputProof)
                   → amount is only decryptable by the sender (ACL enforced)

Contract stores    → FHE.allow(runningTotal, msg.sender)
                   → FHE.allowThis(runningTotal)
                   → only the member + this contract can read it

Payout goes out    → FHE.allow(payoutTotal, recipient)
                   → only the recipient can decrypt their payout history
```

When a member taps **Reveal** in the UI, their wallet signs an EIP-712 message. The Zama Relayer verifies the signature, checks ACL, and decrypts the value — off-chain, back to the wallet owner only.

No other member, no contract, no explorer can see the number.

### Contribution enforcement without leaking information

A naive approach: `require(amount == agreed)`. This leaks one bit — whether you paid the right amount — via revert.

AJO uses FHE arithmetic instead:

```solidity
ebool correct  = FHE.eq(amount, FHE.asEuint64(uint64(g.contributionAmount)));
euint64 accepted = FHE.select(correct, amount, FHE.asEuint64(0));
```

Wrong amount → `accepted` becomes an encrypted `0`. The `confidentialTransferFrom` moves nothing. The paid flag is still set (the member "went through the motions"). No revert, no gas-difference side channel.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 15 Frontend (Vercel)                           │
│  • RainbowKit + wagmi — wallet connection               │
│  • @zama-fhe/react-sdk — useEncrypt / useUserDecrypt    │
│  • hooks/useAjo.ts — all contract read/write logic      │
│  • driver.js — guided walkthrough tour                  │
└────────────────────────┬────────────────────────────────┘
                         │ JSON-RPC (Sepolia)
┌────────────────────────▼────────────────────────────────┐
│  Ethereum Sepolia                                       │
│                                                         │
│  ConfidentialAjo.sol                                    │
│  ├─ inherits ZamaEthereumConfig (FHEVM coprocessor)    │
│  ├─ inherits ReentrancyGuard                            │
│  ├─ createGroup / joinGroup                             │
│  ├─ contribute (FHE.fromExternal + FHE.select enforce) │
│  ├─ _tryExecutePayout (confidentialTransfer to winner) │
│  └─ advanceRoundIfReady (expired-round fallback)       │
│                                                         │
│  AjoToken.sol (ERC-7984 demo faucet)                   │
│  ├─ inherits ERC7984 (OpenZeppelin confidential token) │
│  └─ public mint(address, uint64) for testnet demo      │
└─────────────────────────────────────────────────────────┘
              │
              │ Coprocessor (Zama's FHEVM infra on Sepolia)
              │ handles FHE operations: add, eq, select, ACL
              ▼
        Encrypted state lives on-chain as ciphertext handles.
        Decryption flows through the Zama Relayer with EIP-712
        signature verification — no server, no trusted operator.
```

### Key libraries

| Library | Version | Role |
|---|---|---|
| `@fhevm/solidity` | 0.11.1 | FHE types (`euint64`, `ebool`) + ACL (`FHE.allow`, `FHE.select`, …) |
| `@openzeppelin/confidential-contracts` | 0.5.1 | ERC-7984 confidential token standard |
| `@zama-fhe/react-sdk` | 3.0.0 | React hooks: `useEncrypt`, `useUserDecrypt`, `useIsAllowed` |
| `@fhevm/hardhat-plugin` | 0.4.2 | Local FHEVM mock for TDD |
| Next.js | 15 | Frontend framework |
| RainbowKit + wagmi | latest | Wallet connection |

---

## Deployed Contracts (Ethereum Sepolia)

| Contract | Address | Etherscan |
|---|---|---|
| **ConfidentialAjo** | `0x357223395518B2E1639fDb6D065Dd0a8847b9C5E` | [View source](https://sepolia.etherscan.io/address/0x357223395518B2E1639fDb6D065Dd0a8847b9C5E#code) |
| **AjoToken** (demo ERC-7984 faucet) | `0xF90981C36bFE6cB6df2c0527BF6B601486F39590` | [View source](https://sepolia.etherscan.io/address/0xF90981C36bFE6cB6df2c0527BF6B601486F39590#code) |

Both contracts are Etherscan-verified — source code is readable on the `#code` tab.

---

## Running Locally

### Prerequisites

- Node.js 20+
- A wallet with Sepolia ETH ([faucet](https://sepoliafaucet.com/))

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps   # required: next-themes vs React 19 peer conflict
npm run dev
```

Open http://localhost:3000. The app connects to the deployed Sepolia contracts by default — no local contract deployment needed.

### Contracts (optional — for running tests or redeploying)

```bash
cd contracts
npm install

# Run the full test suite (24 tests, local FHEVM mock)
npx hardhat test

# Deploy to Sepolia (requires PRIVATE_KEY and ETHERSCAN_API_KEY)
npx hardhat vars set PRIVATE_KEY
npx hardhat vars set ETHERSCAN_API_KEY
npx hardhat deploy --network sepolia
```

> **Note on secrets:** This project uses Hardhat `vars` (not `.env`) for private keys. Never commit a private key to version control.

### Using the app end-to-end

1. Connect your wallet (MetaMask or any RainbowKit-compatible wallet) on **Sepolia testnet**.
2. From the home screen, either **Create a circle** or **Open an existing one**.
3. To create: enter the wallet addresses of all members (in payout order), the contribution amount, and a round duration.
4. Each member joins by entering the group ID.
5. Once the group is full, each member:
   - Taps **Mint** to get free test AJOT tokens.
   - Taps **Approve AJO** once (grants the contract operator rights to pull your tokens).
   - Taps **Contribute** each round to pay in.
6. When all members have paid, the contract automatically pays out to the round's recipient.
7. Tap **Reveal** to decrypt and view your own contribution and payout totals. Sign the EIP-712 message in your wallet.

The walkthrough tour (tap **Guide me** at any time) explains every step in plain language.

---

## Test Suite

24 tests cover the full contract lifecycle using TDD with the FHEVM local mock.

```
npx hardhat test
```

Key test cases:
- Group creation and membership validation
- Contribution enforcement (wrong amount → encrypted no-op, not revert)
- Full round-trip: 3 members × 3 rounds, correct rotation
- **Confidentiality money-shot**: member A decrypts their own history ✓; member B cannot decrypt A's history ✓
- Default handling via `advanceRoundIfReady`
- Reentrancy protection

---

## Known Limitations (MVP)

These are documented trade-offs for the hackathon scope, not bugs.

**M2 — Underpayment griefing:** A malicious member can send an encrypted amount that doesn't match the agreed contribution. The contract accepts the call (paid flag is set) but transfers 0 tokens (`FHE.select` to zero). The member occupies their round slot without actually contributing. Mitigation: the frontend always sends the agreed amount; the contract's select-to-zero is a side-channel-safe enforcement. A stricter fix (revert on mismatch without leaking the value) requires FHE comparison with public decryption, which is a larger change.

**L2 — Untrusted token risk:** `ConfidentialAjo` trusts the token address supplied at group creation to return a correct `transferred` value from `confidentialTransferFrom`. Use only the provided `AjoToken` or a trusted ERC-7984 token. A malicious token could return an incorrect ciphertext.

**I1 — Defaulted-round funds stuck:** When `advanceRoundIfReady` advances past a round where some members didn't pay, any partially-escrowed pool is not automatically refunded. It stays in the contract. Roadmap: add a `claimDefaultedFunds` function for the organiser or members to retrieve their pro-rata share.

---

## Roadmap

- [ ] Partial-payment recovery for defaulted rounds
- [ ] Variable contribution amounts with encrypted minimum enforcement
- [ ] Multi-token support (any ERC-7984 token)
- [ ] On-chain dispute resolution with FHE-based arbitration
- [ ] Mobile-native app
- [ ] Integration with stablecoins (once FHEVM mainnet matures)

---

## License

MIT
