import type { ContractDeployment } from "~~/utils/contract";

const REMOTE = {
  11155111: {
    address: "0x357223395518B2E1639fDb6D065Dd0a8847b9C5E",
    abi: [
      {
            "inputs": [],
            "name": "ReentrancyGuardReentrantCall",
            "type": "error"
      },
      {
            "inputs": [
                  {
                        "internalType": "bytes32",
                        "name": "handle",
                        "type": "bytes32"
                  },
                  {
                        "internalType": "address",
                        "name": "sender",
                        "type": "address"
                  }
            ],
            "name": "SenderNotAllowedToUseHandle",
            "type": "error"
      },
      {
            "inputs": [],
            "name": "ZamaProtocolUnsupported",
            "type": "error"
      },
      {
            "anonymous": false,
            "inputs": [
                  {
                        "indexed": true,
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  },
                  {
                        "indexed": true,
                        "internalType": "uint256",
                        "name": "round",
                        "type": "uint256"
                  },
                  {
                        "indexed": true,
                        "internalType": "address",
                        "name": "member",
                        "type": "address"
                  }
            ],
            "name": "Contributed",
            "type": "event"
      },
      {
            "anonymous": false,
            "inputs": [
                  {
                        "indexed": true,
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  }
            ],
            "name": "GroupCompleted",
            "type": "event"
      },
      {
            "anonymous": false,
            "inputs": [
                  {
                        "indexed": true,
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  },
                  {
                        "indexed": true,
                        "internalType": "address",
                        "name": "organizer",
                        "type": "address"
                  },
                  {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "memberCount",
                        "type": "uint256"
                  },
                  {
                        "indexed": false,
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                  }
            ],
            "name": "GroupCreated",
            "type": "event"
      },
      {
            "anonymous": false,
            "inputs": [
                  {
                        "indexed": true,
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  }
            ],
            "name": "GroupStarted",
            "type": "event"
      },
      {
            "anonymous": false,
            "inputs": [
                  {
                        "indexed": true,
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  },
                  {
                        "indexed": true,
                        "internalType": "uint256",
                        "name": "round",
                        "type": "uint256"
                  },
                  {
                        "indexed": true,
                        "internalType": "address",
                        "name": "member",
                        "type": "address"
                  }
            ],
            "name": "MemberDefaulted",
            "type": "event"
      },
      {
            "anonymous": false,
            "inputs": [
                  {
                        "indexed": true,
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  },
                  {
                        "indexed": true,
                        "internalType": "address",
                        "name": "member",
                        "type": "address"
                  },
                  {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "memberIndex",
                        "type": "uint256"
                  }
            ],
            "name": "MemberJoined",
            "type": "event"
      },
      {
            "anonymous": false,
            "inputs": [
                  {
                        "indexed": true,
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  },
                  {
                        "indexed": true,
                        "internalType": "uint256",
                        "name": "round",
                        "type": "uint256"
                  },
                  {
                        "indexed": true,
                        "internalType": "address",
                        "name": "recipient",
                        "type": "address"
                  }
            ],
            "name": "PayoutExecuted",
            "type": "event"
      },
      {
            "anonymous": false,
            "inputs": [
                  {
                        "indexed": true,
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  },
                  {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "newRound",
                        "type": "uint256"
                  }
            ],
            "name": "RoundAdvanced",
            "type": "event"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  }
            ],
            "name": "advanceRoundIfReady",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
      },
      {
            "inputs": [],
            "name": "confidentialProtocolId",
            "outputs": [
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  }
            ],
            "stateMutability": "view",
            "type": "function"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  },
                  {
                        "internalType": "externalEuint64",
                        "name": "encryptedAmount",
                        "type": "bytes32"
                  },
                  {
                        "internalType": "bytes",
                        "name": "inputProof",
                        "type": "bytes"
                  }
            ],
            "name": "contribute",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "memberCount",
                        "type": "uint256"
                  },
                  {
                        "internalType": "uint256",
                        "name": "contributionAmount",
                        "type": "uint256"
                  },
                  {
                        "internalType": "uint256",
                        "name": "roundDuration",
                        "type": "uint256"
                  },
                  {
                        "internalType": "address[]",
                        "name": "payoutOrder_",
                        "type": "address[]"
                  },
                  {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                  }
            ],
            "name": "createGroup",
            "outputs": [
                  {
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  }
            ],
            "name": "getMyEncryptedContributionHistory",
            "outputs": [
                  {
                        "internalType": "euint64",
                        "name": "",
                        "type": "bytes32"
                  }
            ],
            "stateMutability": "view",
            "type": "function"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  }
            ],
            "name": "getMyEncryptedPayoutHistory",
            "outputs": [
                  {
                        "internalType": "euint64",
                        "name": "",
                        "type": "bytes32"
                  }
            ],
            "stateMutability": "view",
            "type": "function"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  }
            ],
            "name": "getPayoutOrder",
            "outputs": [
                  {
                        "internalType": "address[]",
                        "name": "",
                        "type": "address[]"
                  }
            ],
            "stateMutability": "view",
            "type": "function"
      },
      {
            "inputs": [],
            "name": "groupCount",
            "outputs": [
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  }
            ],
            "stateMutability": "view",
            "type": "function"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  }
            ],
            "name": "groups",
            "outputs": [
                  {
                        "internalType": "uint256",
                        "name": "memberCount",
                        "type": "uint256"
                  },
                  {
                        "internalType": "uint256",
                        "name": "contributionAmount",
                        "type": "uint256"
                  },
                  {
                        "internalType": "uint256",
                        "name": "roundDuration",
                        "type": "uint256"
                  },
                  {
                        "internalType": "uint256",
                        "name": "currentRound",
                        "type": "uint256"
                  },
                  {
                        "internalType": "uint256",
                        "name": "roundStartTime",
                        "type": "uint256"
                  },
                  {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                  },
                  {
                        "internalType": "bool",
                        "name": "active",
                        "type": "bool"
                  }
            ],
            "stateMutability": "view",
            "type": "function"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  },
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  },
                  {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                  }
            ],
            "name": "hasPaidThisRound",
            "outputs": [
                  {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                  }
            ],
            "stateMutability": "view",
            "type": "function"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  },
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  },
                  {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                  }
            ],
            "name": "isDefaulted",
            "outputs": [
                  {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                  }
            ],
            "stateMutability": "view",
            "type": "function"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  },
                  {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                  }
            ],
            "name": "isInPayoutOrder",
            "outputs": [
                  {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                  }
            ],
            "stateMutability": "view",
            "type": "function"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  },
                  {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                  }
            ],
            "name": "isMember",
            "outputs": [
                  {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                  }
            ],
            "stateMutability": "view",
            "type": "function"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  }
            ],
            "name": "joinGroup",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "groupId",
                        "type": "uint256"
                  }
            ],
            "name": "memberCountJoined",
            "outputs": [
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  }
            ],
            "stateMutability": "view",
            "type": "function"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  },
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  }
            ],
            "name": "members",
            "outputs": [
                  {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                  }
            ],
            "stateMutability": "view",
            "type": "function"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  },
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  }
            ],
            "name": "paidCount",
            "outputs": [
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  }
            ],
            "stateMutability": "view",
            "type": "function"
      },
      {
            "inputs": [
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  },
                  {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                  }
            ],
            "name": "payoutOrder",
            "outputs": [
                  {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                  }
            ],
            "stateMutability": "view",
            "type": "function"
      }
],
    deployedOnBlock: 11217501,
  },
} as const;

export const ConfidentialAjo = { ...REMOTE } as const satisfies Partial<Record<number, ContractDeployment>>;
