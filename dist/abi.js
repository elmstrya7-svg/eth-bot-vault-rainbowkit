export const ETH_BOT_VAULT_ABI = [
    {
        type: "constructor",
        inputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "receive",
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "balances",
        inputs: [{ name: "user", type: "address", internalType: "address" }],
        outputs: [{ name: "balance", type: "uint256", internalType: "uint256" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "deposit",
        inputs: [],
        outputs: [],
        stateMutability: "payable"
    },
    {
        type: "function",
        name: "depositsPaused",
        inputs: [],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "owner",
        inputs: [],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "setDepositsPaused",
        inputs: [{ name: "paused", type: "bool", internalType: "bool" }],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "totalDeposits",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "withdraw",
        inputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "withdrawAll",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "event",
        name: "Deposited",
        inputs: [
            { name: "user", type: "address", indexed: true, internalType: "address" },
            { name: "amount", type: "uint256", indexed: false, internalType: "uint256" }
        ],
        anonymous: false
    },
    {
        type: "event",
        name: "DepositsPausedSet",
        inputs: [{ name: "paused", type: "bool", indexed: false, internalType: "bool" }],
        anonymous: false
    },
    {
        type: "event",
        name: "Withdrawn",
        inputs: [
            { name: "user", type: "address", indexed: true, internalType: "address" },
            { name: "amount", type: "uint256", indexed: false, internalType: "uint256" }
        ],
        anonymous: false
    },
    {
        type: "error",
        name: "DepositsPaused",
        inputs: []
    },
    {
        type: "error",
        name: "EthTransferFailed",
        inputs: []
    },
    {
        type: "error",
        name: "InsufficientBalance",
        inputs: []
    },
    {
        type: "error",
        name: "NotOwner",
        inputs: []
    },
    {
        type: "error",
        name: "ReentrantCall",
        inputs: []
    },
    {
        type: "error",
        name: "ZeroAmount",
        inputs: []
    }
];
//# sourceMappingURL=abi.js.map