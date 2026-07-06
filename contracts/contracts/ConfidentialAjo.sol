// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ConfidentialAjo — private, on-chain rotating savings circle (ROSCA / Ajo / Esusu)
/// @author AJO
/// @notice Members each contribute a fixed amount per round in a confidential ERC-7984 token;
///         one member receives the pooled amount per round, rotating until everyone has been paid.
///         Contribution/payout AMOUNTS are FHE-encrypted (only the owner can decrypt their own);
///         status flags (current round, who paid, defaults) are intentionally PUBLIC for
///         accountability.
/// @dev SKELETON (Phase 1): state + signatures defined; logic implemented in Phase 2 via TDD.
///      Verified against fhevm/solidity 0.11.1 + openzeppelin/confidential-contracts 0.5.1
///      (2026-07-06). Sepolia config contract is ZamaEthereumConfig (NOT SepoliaConfig).
contract ConfidentialAjo is ZamaEthereumConfig, ReentrancyGuard {
    /// @notice Public group configuration. The AGREED contribution amount is public;
    ///         only actual per-member balances/payouts are encrypted.
    struct Group {
        uint256 memberCount; // N — target number of members
        uint256 contributionAmount; // agreed per-round amount (public plaintext)
        uint256 roundDuration; // seconds per round
        uint256 currentRound; // 1-indexed; 0 = not started / still filling
        uint256 roundStartTime; // timestamp the current round began
        address token; // ERC-7984 confidential token used for contributions
        bool active; // true once the group is full and running
    }

    /// @notice Number of groups created (also the id of the next group).
    uint256 public groupCount;

    /// @notice groupId => group config.
    mapping(uint256 => Group) public groups;

    /// @notice groupId => fixed, public payout order (index = round-1 recipient).
    mapping(uint256 => address[]) public payoutOrder;

    /// @notice groupId => ordered list of joined members.
    mapping(uint256 => address[]) public members;

    /// @notice groupId => address => is invited (i.e. present in the payout order).
    mapping(uint256 => mapping(address => bool)) public isInPayoutOrder;

    /// @notice groupId => member => has joined the group.
    mapping(uint256 => mapping(address => bool)) public isMember;

    /// @notice groupId => round => member => has paid this round (PUBLIC flag).
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasPaidThisRound;

    /// @notice groupId => round => number of members who have paid (PUBLIC count).
    mapping(uint256 => mapping(uint256 => uint256)) public paidCount;

    /// @notice groupId => round => member => defaulted this round (PUBLIC status).
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public isDefaulted;

    /// @notice groupId => encrypted pool of contributions escrowed for the current round.
    mapping(uint256 => euint64) internal encPool;

    /// @notice groupId => member => encrypted running total contributed (owner-decryptable only).
    mapping(uint256 => mapping(address => euint64)) internal encContribHistory;

    /// @notice groupId => member => encrypted running total received (owner-decryptable only).
    mapping(uint256 => mapping(address => euint64)) internal encPayoutHistory;

    event GroupCreated(uint256 indexed groupId, address indexed organizer, uint256 memberCount, address token);
    event MemberJoined(uint256 indexed groupId, address indexed member, uint256 memberIndex);
    event GroupStarted(uint256 indexed groupId);
    event Contributed(uint256 indexed groupId, uint256 indexed round, address indexed member);
    event PayoutExecuted(uint256 indexed groupId, uint256 indexed round, address indexed recipient);
    event RoundAdvanced(uint256 indexed groupId, uint256 newRound);
    event MemberDefaulted(uint256 indexed groupId, uint256 indexed round, address indexed member);
    event GroupCompleted(uint256 indexed groupId);

    // ---------------------------------------------------------------------
    // Phase 2 (TDD): organizer + membership
    // ---------------------------------------------------------------------

    /// @notice Create a new savings group with a fixed public payout order.
    /// @param memberCount target number of members N (must equal payoutOrder_.length)
    /// @param contributionAmount agreed per-round amount (public)
    /// @param roundDuration length of each round in seconds
    /// @param payoutOrder_ fixed, public order in which members receive the pool
    /// @param token address of the ERC-7984 confidential token to use
    /// @return groupId id of the newly created group
    function createGroup(
        uint256 memberCount,
        uint256 contributionAmount,
        uint256 roundDuration,
        address[] calldata payoutOrder_,
        address token
    ) external returns (uint256 groupId) {
        require(memberCount >= 2, "group too small");
        require(memberCount == payoutOrder_.length, "memberCount != payoutOrder length");
        require(contributionAmount <= type(uint64).max, "contribution too large"); // fits euint64

        groupId = groupCount++;

        Group storage g = groups[groupId];
        g.memberCount = memberCount;
        g.contributionAmount = contributionAmount;
        g.roundDuration = roundDuration;
        g.currentRound = 0;
        g.token = token;
        g.active = false;

        for (uint256 i = 0; i < payoutOrder_.length; i++) {
            require(!isInPayoutOrder[groupId][payoutOrder_[i]], "duplicate in payout order");
            isInPayoutOrder[groupId][payoutOrder_[i]] = true;
            payoutOrder[groupId].push(payoutOrder_[i]);
        }

        emit GroupCreated(groupId, msg.sender, memberCount, token);
    }

    /// @notice Join an open group until it reaches N members; starts the group when full.
    /// @param groupId the group to join
    function joinGroup(uint256 groupId) external {
        require(groupId < groupCount, "no such group");
        require(isInPayoutOrder[groupId][msg.sender], "not invited");
        require(!isMember[groupId][msg.sender], "already joined");

        isMember[groupId][msg.sender] = true;
        uint256 memberIndex = members[groupId].length;
        members[groupId].push(msg.sender);
        emit MemberJoined(groupId, msg.sender, memberIndex);

        Group storage g = groups[groupId];
        if (members[groupId].length == g.memberCount) {
            g.active = true;
            g.currentRound = 1;
            g.roundStartTime = block.timestamp;
            emit GroupStarted(groupId);
        }
    }

    // ---------------------------------------------------------------------
    // Phase 2/3 (TDD): confidential contribution + rotating payout
    // ---------------------------------------------------------------------

    /// @notice Contribute this round's amount in confidential tokens. Others see only that
    ///         you paid (public flag), never the amount.
    /// @param groupId the group to contribute to
    /// @param encryptedAmount client-side encrypted contribution amount
    /// @param inputProof Zama input proof accompanying `encryptedAmount`
    /// @dev Must: validate membership + not-yet-paid; FHE.fromExternal + FHE.isSenderAllowed;
    ///      enforce amount == agreed via FHE.select (no branching on ciphertext); pull via
    ///      ERC-7984 confidentialTransferFrom into escrow; set public paid flag; update the
    ///      caller's encrypted total and FHE.allow it to them; trigger payout when all N paid.
    function contribute(
        uint256 groupId,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external nonReentrant {
        Group storage g = groups[groupId];
        require(g.active, "group not active");
        require(isMember[groupId][msg.sender], "not a member");
        uint256 round = g.currentRound;
        require(!hasPaidThisRound[groupId][round][msg.sender], "already paid this round");

        // Validate and import the caller's encrypted contribution.
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        require(FHE.isSenderAllowed(amount), "unauthorized amount");

        // Enforce amount == agreed contribution WITHOUT branching on ciphertext:
        // if it differs, `accepted` becomes an encrypted 0 (a no-op transfer) rather than
        // reverting, so no information leaks via revert/gas side channels.
        ebool correct = FHE.eq(amount, FHE.asEuint64(uint64(g.contributionAmount)));
        euint64 accepted = FHE.select(correct, amount, FHE.asEuint64(0));

        // EFFECTS before INTERACTION (checks-effects-interactions): mark participation and
        // count the payment before making the external token call. `nonReentrant` also guards
        // against a malicious/attacker-supplied token re-entering.
        hasPaidThisRound[groupId][round][msg.sender] = true;
        paidCount[groupId][round] += 1;

        // Let this contract keep operating on `accepted`, and let the token contract read it
        // for the duration of this transaction so it can move the funds.
        FHE.allowThis(accepted);
        FHE.allowTransient(accepted, g.token);

        // Pull the confidential funds into escrow. Requires the member to have set this
        // contract as an operator on the token (setOperator).
        euint64 transferred = IERC7984(g.token).confidentialTransferFrom(msg.sender, address(this), accepted);

        // Update the member's encrypted running total; grant ONLY them decryption rights.
        euint64 newTotal = FHE.add(encContribHistory[groupId][msg.sender], transferred);
        FHE.allowThis(newTotal);
        FHE.allow(newTotal, msg.sender);
        encContribHistory[groupId][msg.sender] = newTotal;

        // Accumulate the encrypted round pool for payout.
        euint64 newPool = FHE.add(encPool[groupId], transferred);
        FHE.allowThis(newPool);
        encPool[groupId] = newPool;

        emit Contributed(groupId, round, msg.sender);

        // Once everyone has paid, pay out the round's recipient.
        if (paidCount[groupId][round] == g.memberCount) {
            _tryExecutePayout(groupId);
        }
    }

    /// @notice Manually advance an expired round in which not everyone paid. Flags each
    ///         non-paying member as defaulted (public status) and moves to the next round.
    /// @dev The happy path (all members paid) advances automatically inside `contribute`.
    ///      This is the fallback for stalled rounds. NOTE (MVP limitation): funds already
    ///      escrowed for a defaulted round are not auto-refunded — see README roadmap.
    /// @param groupId the group to advance
    function advanceRoundIfReady(uint256 groupId) external nonReentrant {
        Group storage g = groups[groupId];
        require(g.active, "group not active");
        uint256 round = g.currentRound;
        require(block.timestamp >= g.roundStartTime + g.roundDuration, "round not over");

        address[] memory ms = members[groupId];
        for (uint256 i = 0; i < ms.length; i++) {
            if (!hasPaidThisRound[groupId][round][ms[i]]) {
                isDefaulted[groupId][round][ms[i]] = true;
                emit MemberDefaulted(groupId, round, ms[i]);
            }
        }
        _advanceRound(groupId);
    }

    /// @notice Internal: pay the current round's designated recipient the pooled amount and
    ///         advance the round. Called automatically once all N members have paid.
    /// @param groupId the group to pay out
    function _tryExecutePayout(uint256 groupId) internal {
        Group storage g = groups[groupId];
        uint256 round = g.currentRound;
        address recipient = payoutOrder[groupId][round - 1];

        // Transfer the escrowed encrypted pool from this contract to the recipient. The token
        // needs transient access to the ciphertext to move it.
        euint64 pool = encPool[groupId];
        FHE.allowThis(pool);
        FHE.allowTransient(pool, g.token);
        euint64 transferred = IERC7984(g.token).confidentialTransfer(recipient, pool);

        // Update the recipient's encrypted payout total; grant ONLY them decryption rights.
        euint64 newPayout = FHE.add(encPayoutHistory[groupId][recipient], transferred);
        FHE.allowThis(newPayout);
        FHE.allow(newPayout, recipient);
        encPayoutHistory[groupId][recipient] = newPayout;

        // Reset the pool for the next round.
        euint64 zero = FHE.asEuint64(0);
        FHE.allowThis(zero);
        encPool[groupId] = zero;

        emit PayoutExecuted(groupId, round, recipient);
        _advanceRound(groupId);
    }

    /// @notice Internal: move to the next round, or complete the group after the final round.
    /// @param groupId the group to advance
    function _advanceRound(uint256 groupId) internal {
        Group storage g = groups[groupId];
        if (g.currentRound >= g.memberCount) {
            g.active = false;
            emit GroupCompleted(groupId);
        } else {
            g.currentRound += 1;
            g.roundStartTime = block.timestamp;
            emit RoundAdvanced(groupId, g.currentRound);
        }
    }

    // ---------------------------------------------------------------------
    // Views — public metadata + owner-only encrypted history
    // ---------------------------------------------------------------------

    /// @notice Return the caller's encrypted contribution history handle for a group.
    ///         Decryptable client-side only by the caller (via ACL), through the Relayer SDK.
    /// @param groupId the group to query
    /// @return the caller's encrypted running contribution total
    function getMyEncryptedContributionHistory(uint256 groupId) external view returns (euint64) {
        return encContribHistory[groupId][msg.sender];
    }

    /// @notice Return the caller's encrypted payout history handle for a group.
    /// @param groupId the group to query
    /// @return the caller's encrypted running payout total
    function getMyEncryptedPayoutHistory(uint256 groupId) external view returns (euint64) {
        return encPayoutHistory[groupId][msg.sender];
    }

    /// @notice Public group metadata: number of members currently joined.
    /// @param groupId the group to query
    /// @return count of joined members
    function memberCountJoined(uint256 groupId) external view returns (uint256) {
        return members[groupId].length;
    }

    /// @notice Public payout order for a group.
    /// @param groupId the group to query
    /// @return the ordered list of recipient addresses
    function getPayoutOrder(uint256 groupId) external view returns (address[] memory) {
        return payoutOrder[groupId];
    }
}
