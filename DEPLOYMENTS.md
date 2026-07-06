# Deployments

## Ethereum Sepolia (chainId 11155111) — 2026-07-06

| Contract | Address | Etherscan |
|---|---|---|
| **ConfidentialAjo** | `0x357223395518B2E1639fDb6D065Dd0a8847b9C5E` | https://sepolia.etherscan.io/address/0x357223395518B2E1639fDb6D065Dd0a8847b9C5E |
| **AjoToken** (ERC-7984 demo faucet) | `0xF90981C36bFE6cB6df2c0527BF6B601486F39590` | https://sepolia.etherscan.io/address/0xF90981C36bFE6cB6df2c0527BF6B601486F39590 |

- Deployer: `0x6CcD3c9b8D0AB1F94544Cb9A2bC3281f7c10a5E9`
- RPC: public `https://ethereum-sepolia-rpc.publicnode.com` (override via `hardhat vars set SEPOLIA_RPC_URL`)
- Config contract: `ZamaEthereumConfig` (Sepolia FHEVM coprocessor)
- Smoke test passed: token reports `Ajo Test Token / AJOT`; ConfidentialAjo reports `groupCount = 0`.

**Etherscan verification:** ✅ DONE (2026-07-06). Both contracts verified — source readable at the `#code` tab on each address above. (Etherscan V2 API: config uses a single `apiKey` string.)
