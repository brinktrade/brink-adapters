// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.7.6;

import "../Adapters/Withdrawable.sol";
import "../Adapters/UniV2/UniV2AdapterCore.sol";

contract MockUniV2Adapter is UniV2AdapterCore, Withdrawable {

  constructor(IWETH _weth, address _factory, address _owner)
    UniV2AdapterCore(_weth, _factory)
    Withdrawable(_owner)
  { }

  receive() external payable {}

  function tokenToTokenExcess(IERC20 tokenIn, IERC20 tokenOut, uint tokenInAmount, uint tokenOutAmount) external view override returns (address[] memory excessTokens, int[] memory excessAmounts) { }
  function ethToTokenExcess(IERC20 token, uint ethAmount, uint tokenAmount) external view override returns (address[] memory excessTokens, int[] memory excessAmounts) { }
  function tokenToEthExcess(IERC20 token, uint tokenAmount, uint ethAmount) external view override returns (address[] memory excessTokens, int[] memory excessAmounts) { }
  function tokenToToken(IERC20 tokenIn, IERC20 tokenOut, uint tokenInAmount, uint tokenOutAmount, address account) external override { }
  function ethToToken(IERC20 token, uint tokenAmount, address account) external payable override { }
  function tokenToEth(IERC20 token, uint tokenAmount, uint ethAmount, address account) external override { }
}
