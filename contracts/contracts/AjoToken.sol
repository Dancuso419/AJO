// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/// @title AjoToken — mintable confidential ERC-7984 test token for AJO demos
/// @author AJO
/// @notice A freely mintable confidential fungible token used to demo the AJO ROSCA
///         on Sepolia. This is a DEMO FAUCET — anyone can mint any amount. Do NOT use
///         in production.
/// @dev Verified against openzeppelin/confidential-contracts 0.5.1 (ERC7984) and
///      fhevm/solidity 0.11.1 (2026-07-06). Inherits ZamaEthereumConfig so the token
///      itself is wired to the Zama coprocessor for Sepolia.
contract AjoToken is ERC7984, ZamaEthereumConfig {
    constructor() ERC7984("Ajo Test Token", "AJOT", "") {}

    /// @notice Mint `amount` confidential tokens to `to`. Unrestricted demo faucet.
    /// @param to recipient of the newly minted confidential balance
    /// @param amount plaintext amount to mint (cast to an encrypted euint64 on-chain)
    /// @dev `_mint` -> `_update` grants `to` permanent decrypt rights on their new
    ///      balance via `FHE.allow`, so only `to` can reveal their own balance.
    function mint(address to, uint64 amount) external {
        euint64 encAmount = FHE.asEuint64(amount);
        FHE.allowThis(encAmount);
        _mint(to, encAmount);
    }
}
