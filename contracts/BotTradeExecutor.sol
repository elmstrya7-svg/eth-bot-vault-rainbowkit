// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BotTradeExecutor
/// @notice Restricted executor for off-chain simulated trades. It only calls owner-approved targets.
contract BotTradeExecutor {
    address public immutable owner;
    address payable public immutable botWallet;
    bool public paused;

    mapping(address target => bool approved) public approvedTargets;
    mapping(address token => bool approved) public approvedTokens;

    uint256 private locked = 1;

    event ApprovedTargetSet(address indexed target, bool approved);
    event ApprovedTokenSet(address indexed token, bool approved);
    event TokenApprovalSet(address indexed token, address indexed spender, uint256 amount);
    event PausedSet(bool paused);
    event TradeExecuted(address indexed operator, address indexed target, uint256 value, bytes32 calldataHash, uint256 balanceAfter);
    event WithdrawnToBot(uint256 amount);

    error NotOwner();
    error NotBotOperator();
    error Paused();
    error ReentrantCall();
    error TargetNotApproved();
    error TokenNotApproved();
    error InvalidArrayLength();
    error ZeroAddress();
    error ExternalCallFailed(bytes returnData);
    error MinBalanceNotMet(uint256 balanceAfter, uint256 minBalanceAfter);
    error EthTransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyBotOperator() {
        if (msg.sender != owner && msg.sender != botWallet) revert NotBotOperator();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    modifier nonReentrant() {
        if (locked != 1) revert ReentrantCall();
        locked = 2;
        _;
        locked = 1;
    }

    constructor(address payable botWallet_) {
        if (botWallet_ == address(0)) revert ZeroAddress();
        owner = msg.sender;
        botWallet = botWallet_;
    }

    receive() external payable {}

    function setApprovedTarget(address target, bool approved) external onlyOwner {
        if (target == address(0)) revert ZeroAddress();
        approvedTargets[target] = approved;
        emit ApprovedTargetSet(target, approved);
    }

    function setApprovedToken(address token, bool approved) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        approvedTokens[token] = approved;
        emit ApprovedTokenSet(token, approved);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedSet(paused_);
    }

    function approveToken(address token, address spender, uint256 amount) external onlyBotOperator whenNotPaused {
        if (!approvedTokens[token]) revert TokenNotApproved();
        if (!approvedTargets[spender]) revert TargetNotApproved();

        (bool ok, bytes memory result) = token.call(
            abi.encodeWithSignature("approve(address,uint256)", spender, amount)
        );
        if (!ok) revert ExternalCallFailed(result);

        emit TokenApprovalSet(token, spender, amount);
    }

    function executeTrade(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 minBalanceAfter
    ) external payable onlyBotOperator whenNotPaused nonReentrant returns (bytes memory returnData) {
        if (!approvedTargets[target]) revert TargetNotApproved();

        (bool ok, bytes memory result) = target.call{ value: value }(data);
        if (!ok) revert ExternalCallFailed(result);

        uint256 balanceAfter = address(this).balance;
        if (balanceAfter < minBalanceAfter) revert MinBalanceNotMet(balanceAfter, minBalanceAfter);

        emit TradeExecuted(msg.sender, target, value, keccak256(data), balanceAfter);
        return result;
    }

    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        uint256 minBalanceAfter
    ) external payable onlyBotOperator whenNotPaused nonReentrant returns (bytes[] memory returnData) {
        if (targets.length != values.length || targets.length != payloads.length) revert InvalidArrayLength();

        returnData = new bytes[](targets.length);

        for (uint256 i = 0; i < targets.length; i++) {
            address target = targets[i];
            if (!approvedTargets[target]) revert TargetNotApproved();

            (bool ok, bytes memory result) = target.call{ value: values[i] }(payloads[i]);
            if (!ok) revert ExternalCallFailed(result);

            returnData[i] = result;
            emit TradeExecuted(msg.sender, target, values[i], keccak256(payloads[i]), address(this).balance);
        }

        uint256 balanceAfter = address(this).balance;
        if (balanceAfter < minBalanceAfter) revert MinBalanceNotMet(balanceAfter, minBalanceAfter);
    }

    function withdrawToBot(uint256 amount) external onlyBotOperator nonReentrant {
        (bool ok, ) = botWallet.call{ value: amount }("");
        if (!ok) revert EthTransferFailed();

        emit WithdrawnToBot(amount);
    }
}
