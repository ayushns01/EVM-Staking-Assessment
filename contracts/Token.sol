// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestDope (THOPE)
 * @notice ERC-20 token used for staking and rewards in the THOPE Staking Protocol
 * @dev Fixed supply of 1,000,000 tokens minted to deployer
 */
contract TestDope is ERC20 {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18;

    constructor() ERC20("TestDope", "THOPE") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}
