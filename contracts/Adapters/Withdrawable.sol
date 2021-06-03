// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '../Libraries/TransferHelper.sol';

contract Withdrawable is Ownable {
  constructor (address _owner) {
    transferOwnership(_owner);
  }

  function withdrawToken(IERC20 token, uint amount, address to) external onlyOwner {
    TransferHelper.safeTransfer(address(token), to, amount);
  }

  function withdrawEth(uint amount, address payable to) external onlyOwner {
    (bool success, ) = to.call{value: amount}("");
    require(success, "Withdrawable: withdrawEth call failed");
  }
}
