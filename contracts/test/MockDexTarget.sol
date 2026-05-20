// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockDexTarget {
    event Swapped(address indexed sender, uint256 value, uint256 profit);

    receive() external payable {}

    function swapWithProfit(uint256 profit) external payable {
        emit Swapped(msg.sender, msg.value, profit);

        if (profit > 0) {
            (bool ok, ) = msg.sender.call{ value: msg.value + profit }("");
            require(ok, "profit transfer failed");
        }
    }

    function alwaysRevert() external pure {
        revert("mock revert");
    }

    function pullToken(address token, uint256 amount) external {
        (bool ok, bytes memory result) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), amount)
        );

        require(ok && (result.length == 0 || abi.decode(result, (bool))), "token pull failed");
    }
}
