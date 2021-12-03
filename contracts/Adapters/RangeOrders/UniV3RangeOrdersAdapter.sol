// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.7.6;
pragma abicoder v2;

import "@brinkninja/range-orders/contracts/interfaces/IRangeOrderPositionManager.sol";
import "../../OpenZeppelin/IERC20.sol";
import "../IWETH.sol";
import "../Withdrawable.sol";

contract UniV3RangeOrdersAdapter is Withdrawable {

  IRangeOrderPositionManager public immutable rangeOrderPositionManager;
  IWETH public immutable weth;

  receive() external payable {}

  constructor(IRangeOrderPositionManager _rangeOrderPositionManager, IWETH _weth, address _owner)
    Withdrawable(_owner)
  {
    rangeOrderPositionManager = _rangeOrderPositionManager;
    weth = _weth;
  }

  function sendRangeOrder (IRangeOrderPositionManager.IncreaseLiquidityParams calldata params)
    external
  {
    IERC20(params.tokenIn).approve(address(rangeOrderPositionManager), params.inputAmount);
    rangeOrderPositionManager.increaseLiquidity(params);
  }

  function sendRangeOrderETH (IRangeOrderPositionManager.IncreaseLiquidityParams calldata params)
    external payable
  {
    weth.deposit{value: params.inputAmount}();
    IERC20(address(weth)).approve(address(rangeOrderPositionManager), params.inputAmount);
    rangeOrderPositionManager.increaseLiquidity(params);
  }

  function sendRangeOrderBatch (IRangeOrderPositionManager.IncreaseLiquidityMultiParams calldata params)
    external
  {
    IERC20(params.tokenIn).approve(address(rangeOrderPositionManager), params.totalInputAmount);
    rangeOrderPositionManager.increaseLiquidityMulti(params);
  }

  function sendRangeOrderBatchETH (IRangeOrderPositionManager.IncreaseLiquidityMultiParams calldata params)
    external payable
  {
    weth.deposit{value: params.totalInputAmount}();
    IERC20(address(weth)).approve(address(rangeOrderPositionManager), params.totalInputAmount);
    rangeOrderPositionManager.increaseLiquidityMulti(params);
  }

}
