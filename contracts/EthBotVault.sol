// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title EthBotVault
/// @notice Minimal ETH vault for a trading-bot UI. Users can only withdraw their own deposits.
contract EthBotVault {
    address public immutable owner;
    bool public depositsPaused;
    uint256 public totalDeposits;

    mapping(address user => uint256 balance) public balances;
    mapping(address user => bool enabled) public botEnabled;

    uint256 private locked = 1;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event BotStarted(address indexed user);
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

    function startBot() external {
        if (balances[msg.sender] == 0) revert NoVaultBalance();
        botEnabled[msg.sender] = true;
        emit BotStarted(msg.sender);
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
