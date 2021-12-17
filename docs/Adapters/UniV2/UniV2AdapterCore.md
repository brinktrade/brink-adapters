## `UniV2AdapterCore`






### `initialize(contract IWETH _weth, address _factory)` (external)





### `tokenToTokenOutputAmount(contract IERC20 tokenIn, contract IERC20 tokenOut, uint256 tokenInAmount) → uint256 tokenOutAmount` (public)





### `tokenToTokenInputAmount(contract IERC20 tokenIn, contract IERC20 tokenOut, uint256 tokenOutAmount) → uint256 tokenInAmount` (public)





### `ethToTokenOutputAmount(contract IERC20 token, uint256 ethInAmount) → uint256 tokenOutAmount` (public)





### `ethToTokenInputAmount(contract IERC20 token, uint256 tokenOutAmount) → uint256 ethInAmount` (public)





### `tokenToEthOutputAmount(contract IERC20 token, uint256 tokenInAmount) → uint256 ethOutAmount` (public)





### `tokenToEthInputAmount(contract IERC20 token, uint256 ethOutAmount) → uint256 tokenInAmount` (public)





### `_singlePairSwap(contract IERC20 tokenIn, contract IERC20 tokenOut, uint256 tokenInAmount, uint256 tokenOutAmount, address to)` (internal)





### `_swap(uint256[] amounts, address[] path, address _to)` (internal)





### `_transferInputToPair(contract IERC20 tokenIn, contract IERC20 tokenOut, uint256 tokenInAmount)` (internal)





### `_amountOut(contract IERC20 tokenIn, contract IERC20 tokenOut, uint256 tokenInAmount) → uint256 tokenOutAmount` (internal)





### `_amountIn(contract IERC20 tokenIn, contract IERC20 tokenOut, uint256 tokenOutAmount) → uint256 tokenInAmount` (internal)





### `_path(contract IERC20 tokenIn, contract IERC20 tokenOut) → address[] path` (internal)





### `_amounts(uint256 amountIn, uint256 amountOut) → uint256[] amounts` (internal)








