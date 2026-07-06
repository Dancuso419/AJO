TECHNICAL REQUIREMENTS DOCUMENT  
Ajo — Private Rotating Savings Circle  
Zama Developer Program, Mainnet Season 3, Builder Track  
Deadline: July 7, 2026, 23:59 AOE

\======================================================================  
CRITICAL GROUND RULE — READ FIRST  
\======================================================================  
Do NOT assume any API, function signature, import path, package name,  
package version, contract inheritance pattern, or SDK behavior from  
training data or memory. FHEVM/Zama libraries change frequently and  
outdated assumptions WILL produce broken code.

Before writing or modifying any code that touches Zama/FHEVM/OpenZeppelin  
confidential-contracts APIs, you MUST:  
1\. Check the current source of truth first:  
   \- https://docs.zama.org (Solidity Guides, Protocol docs, Examples)  
   \- https://github.com/zama-ai (especially zama-ai/fhevm,  
     zama-ai/fhevm-hardhat-template, zama-ai/fhevm-react-template)  
   \- https://github.com/OpenZeppelin/openzeppelin-confidential-contracts  
   \- https://docs.openzeppelin.com/confidential-contracts  
2\. If something is ambiguous, versioned differently across docs, or not  
   confirmed by the above sources — STOP and ASK ME before proceeding.  
   Do not guess, do not "best-effort" fill the gap, do not silently pick  
   one interpretation.  
3\. When you do confirm something from a source, note which source/version  
   you confirmed it against in a code comment or commit message, so I can  
   verify it later.

This applies to: import paths, config contract names (e.g. SepoliaConfig  
vs ZamaEthereumConfig), encrypted type behavior, ACL functions (FHE.allow,  
FHE.allowThis, FHE.allowTransient, FHE.isSenderAllowed,  
FHE.makePubliclyDecryptable), decryption flows (user decryption via  
Relayer SDK vs FHE.requestDecryption on-chain callback), ERC7984 function  
signatures (confidentialTransfer, confidentialTransferFrom, operator  
model), npm package names/versions, and Hardhat/Foundry config specifics.

\======================================================================  
1\. PROBLEM STATEMENT  
\======================================================================  
Rotating Savings and Credit Associations (ROSCAs) — Ajo/Esusu (Nigeria/  
West Africa), Susu (Ghana), Chama (Kenya), Chit funds (India), Tanda  
(Mexico), Hui (China), Paluwagan (Philippines) — are used by over a  
billion people globally. Members contribute a fixed amount per round;  
one member receives the pooled amount per round, rotating until everyone  
has been paid once.

Two unsolved problems:  
1\. Trust/fraud: a human collector can misreport contributions, skip  
   payouts, or abscond with funds.  
2\. Privacy: naive on-chain versions expose every member's exact  
   contribution/payout amount to the whole group and the public.

Confidential Ajo solves both — automatic on-chain enforcement (trust)  
plus FHE-encrypted amounts via Zama's FHEVM (privacy).

\======================================================================  
2\. MVP SCOPE (IN)  
\======================================================================  
\- Confidential ROSCA smart contract, deployed to Ethereum Sepolia  
\- Frontend: create group, join group, contribute per round, view own  
  encrypted contribution/payout history (decryptable only by the owner)  
\- README documenting the confidentiality/ACL model  
\- 3-minute video pitch (real person, real voice — no AI-generated video  
  or voiceover, per Zama Builder Track rules)

\======================================================================  
3\. OUT OF SCOPE FOR THIS SUBMISSION (call out as "roadmap" in docs)  
\======================================================================  
\- Randomized/bid-based payout order (fixed order only for MVP)  
\- Polished multi-group factory UI  
\- Automated round-timing/cron (manual "advance round" trigger is fine)  
\- Cross-chain support  
\- Mobile app

\======================================================================  
4\. USER STORIES  
\======================================================================  
1\. Organizer creates a group: member count (N), contribution amount,  
   round duration, payout order (address list), confidential token used.  
2\. Member joins a group (until it reaches N members).  
3\. Member contributes their round's amount in confidential tokens;  
   other members see only that they DID contribute (public flag), not  
   the amount.  
4\. Once all N members contribute for the round, the round's designated  
   recipient automatically receives the pooled amount (encrypted,  
   decryptable only by them).  
5\. Member decrypts and views their own contribution/payout history via  
   wallet signature — nobody else can.  
6\. Anyone can see public group metadata (current round, who has/hasn't  
   paid, group size) without seeing amounts.  
7\. If a member misses a round, they're flagged as defaulted (this status  
   is intentionally PUBLIC — accountability, not privacy), while the  
   exact shortfall amount stays encrypted.

\======================================================================  
5\. TECHNICAL ARCHITECTURE (VERIFY EVERYTHING BELOW BEFORE USE)  
\======================================================================

5.1 Contracts (verify against zama-ai/fhevm-hardhat-template \+ docs.zama.org)  
\- Base scaffold: fork zama-ai/fhevm-hardhat-template (GitHub)  
\- FHE Solidity library: @fhevm/solidity — verify current import path  
  (e.g. "@fhevm/solidity/lib/FHE.sol") and current version  
\- Config contract for Sepolia — verify whether it's SepoliaConfig,  
  ZamaEthereumConfig, or something else in the CURRENT docs version  
  (this has changed across doc versions — do not assume)  
\- Confidential token standard: @openzeppelin/confidential-contracts  
  — verify current ERC7984 import path and constructor signature  
\- Solidity version — verify current recommended pragma (was ^0.8.24  
  to ^0.8.27 across different examples — confirm current)

5.2 Frontend (verify against zama-ai/fhevm-react-template)  
\- Relayer/encryption SDK — verify current package name (seen as both  
  @zama-fhe/relayer-sdk and @zama-fhe/sdk \+ @zama-fhe/react-sdk across  
  different docs/templates — confirm which is current)  
\- Reference scaffold: zama-ai/fhevm-react-template (Next.js, React,  
  wagmi, viem, RainbowKit, Tailwind/daisyUI)  
\- Wallet connection: RainbowKit/wagmi from template, or simpler  
  ethers.js \+ MetaMask if time-constrained

5.3 Core FHEVM concepts contract MUST use correctly (verify exact  
    function names/signatures against current docs before use)  
\- Encrypted types: euint64 (amounts), ebool (comparisons), eaddress,  
  externalEuint64 (encrypted user input, paired with an inputProof)  
\- ACL functions — verify exact current signatures:  
  \- grant contract self-access to keep operating on a ciphertext  
  \- grant a specific address permanent decryption rights  
  \- grant transient/temporary access scoped to current transaction  
  \- validate sender is authorized before operating on external ciphertext  
  \- make a value publicly decryptable (NOT used for individual amounts  
    in this app — only if ever needed for aggregate public stats)  
\- Casting: plaintext-to-encrypted, and external-input-to-encrypted  
  (with inputProof validation)  
\- Arithmetic/logic on ciphertexts: add, sub, and an encrypted-select/  
  ternary (needed because you cannot branch directly on an encrypted  
  boolean — confirm current function name for this)  
\- Decryption flow — TWO patterns, confirm which fits each use case:  
  1\. User decryption (client-side via Relayer SDK, EIP-712 signature,  
     no on-chain callback) — use for "member views own history"  
  2\. On-chain requested decryption (contract-initiated, async, relayer  
     \+ KMS fulfill with a callback \+ proof check) — only if the  
     CONTRACT itself needs a decrypted value to make a decision

5.4 Contract design (adjust based on verified APIs above)  
\- ConfidentialAjo.sol: group/round/payout state machine  
\- A confidential ERC7984 token for actual money movement — either wrap  
  a test Sepolia ERC-20 via the wrapper contract, or deploy a simple  
  mintable ERC7984 test token for demo speed (verify current  
  constructor/mint pattern before use)

Suggested state (verify field types/patterns against current examples):  
\- Group: memberCount, contributionAmount, roundDuration, currentRound,  
  roundStartTime, payoutOrder\[\], token address, active flag  
\- isMember mapping  
\- hasPaidThisRound mapping (public)  
\- encrypted per-member contribution history accumulator  
\- encrypted per-member payout history accumulator

Suggested functions (verify signatures/patterns before implementing):  
\- createGroup(...)  
\- joinGroup(groupId)  
\- contribute(groupId, externalEuint64 encryptedAmount, bytes inputProof)  
\- internal payout-trigger logic once all members have paid  
\- advanceRoundIfReady(groupId) — manual trigger fallback  
\- getMyEncryptedContributionHistory(groupId) — returns ciphertext the  
  caller can decrypt client-side if ACL-authorized

Key logic for contribute():  
1\. Validate sender is a group member and hasn't paid this round  
2\. Convert external encrypted input to internal encrypted type,  
   validate sender is authorized to use it  
3\. Enforce contribution equals agreed amount using an encrypted  
   select/ternary (avoid branching directly on encrypted comparison  
   results — confirm safe pattern in current docs to avoid side-channel  
   leaks via revert/gas differences)  
4\. Move funds into escrow via the confidential token's transfer-from  
   function (verify current function name/signature and whether an  
   operator/allowance must be set first)  
5\. Update public hasPaidThisRound flag  
6\. Update member's encrypted running contribution total; grant them  
   ACL access so only they can ever decrypt it  
7\. If all N members paid this round: trigger payout to the round's  
   designated recipient, grant them ACL access to their payout amount,  
   advance to next round

\======================================================================  
6\. FRONTEND REQUIREMENTS  
\======================================================================  
\- Wallet connect  
\- Create Group form (member count, contribution amount, round  
  duration, payout order list)  
\- Join Group flow (browse open groups, join)  
\- Contribute flow: encrypt amount client-side via Relayer SDK, submit  
  with input proof  
\- My Group Dashboard: current round, who has/hasn't paid (public),  
  "your turn" indicator  
\- My History (private): decrypt-and-display caller's own encrypted  
  totals via user-decryption (EIP-712 flow) — THIS IS THE KEY DEMO  
  MOMENT: show that only the connected wallet can reveal its own  
  numbers, another wallet gets nothing  
\- Clear UI distinction between public info (round \#, who paid, group  
  size) and private info (amounts) — e.g. lock icon/blur until decrypted

\======================================================================  
7\. DOCUMENTATION DELIVERABLES  
\======================================================================  
\- README.md: problem statement, architecture diagram, how  
  confidentiality/ACL is enforced, setup/deploy instructions, deployed  
  Sepolia contract address, known limitations/roadmap  
\- NatSpec comments on all public/external functions, especially around  
  ACL grants

\======================================================================  
8\. VIDEO PITCH (3 MIN) — SUGGESTED STRUCTURE  
\======================================================================  
0:00–0:30  The problem: ROSCA fraud/trust \+ why people avoid  
           formalizing them (privacy)  
0:30–1:00  Global scale (Ajo, Susu, Chama, chit funds, tanda, hui —  
           "over a billion people already do this manually")  
1:00–2:15  Live demo: create group, two wallets join and contribute,  
           payout executes, Wallet A decrypts its own history,  
           Wallet B cannot see Wallet A's amounts  
2:15–3:00  Architecture recap \+ roadmap  
MUST be a real person's face/voice — no AI-generated video/voiceover.

\======================================================================  
9\. SUBMISSION CHECKLIST  
\======================================================================  
\[ \] Contract deployed and verified on Sepolia  
\[ \] Frontend deployed or clear local run instructions  
\[ \] GitHub repo public, README complete  
\[ \] 3-minute video (real person/voice) per submission instructions  
\[ \] Submitted via Zama Developer Hub before July 7, 23:59 AOE  
\[ \] Shared on X tagging @zama with \#ZamaDeveloperProgram

\======================================================================  
10\. STANDING INSTRUCTION FOR THE ENTIRE BUILD  
\======================================================================  
At every step where you are about to write Zama/FHEVM/OpenZeppelin  
confidential-contracts-specific code: check the current docs/GitHub  
source first. If the current source doesn't clearly resolve the  
question, or sources conflict, STOP and ask me rather than guessing.  
Flag in your response which parts you verified and which parts you  
are still uncertain about.  
