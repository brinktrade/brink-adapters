const { ethers } = require('hardhat')
const { expectRevert, constants } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = constants
const {
  chaiSolidity,
  deployUniswapV2,
  randomAddress,
  BN,
  BN15,
  BN16
} = require('@brinkninja/test-helpers')
const { expect } = chaiSolidity()

async function getSigners () {
  const [ ethStore ] = await ethers.getSigners()
  return { ethStore }
}

describe('UniV2ExcessWethCrossPair', function () {
  beforeEach(async function () {
    const UniV2ExcessWethCrossPair = await ethers.getContractFactory('UniV2ExcessWethCrossPair')
    this.accountAddress = (await randomAddress()).address
    this.adapterOwnerAddress = (await randomAddress()).address

    const { factory, weth, router, tokenA, tokenB } = await deployUniswapV2()
    this.factory = factory
    this.router = router
    this.weth = weth
    this.tokenA = tokenA
    this.tokenB = tokenB

    this.adapter = await UniV2ExcessWethCrossPair.deploy(this.weth.address, this.factory.address, this.adapterOwnerAddress)
  })

  describe('when sent eth', function () {
    it('should receive it', async function () {
      const { ethStore } = await getSigners()
      const ethAmt = BN(3).mul(BN16)
      await sendEth(ethStore, this.adapter.address, ethAmt)
      expect(await ethBalance(this.adapter.address)).to.equal(ethAmt)
    })
  })

  describe('tokenToTokenOutputAmount', function () {
    it('should return output from cross weth pair', async function () {
      const tokenA_in = BN(1).mul(BN16)
      const wethCrossAmount = await amountOut.call(this, this.tokenA, this.weth, tokenA_in)
      const tokenB_expectedOut = await amountOut.call(this, this.weth, this.tokenB, wethCrossAmount)
      const tokenB_out = await this.adapter.tokenToTokenOutputAmount(
        this.tokenA.address, this.tokenB.address, tokenA_in
      )
      expect(tokenB_out).to.equal(tokenB_expectedOut)
    })
  })

  describe('tokenToTokenInputAmount', function () {
    it('should return input', async function () {
      const tokenB_out = BN(1).mul(BN16)
      const wethCrossAmount = await amountIn.call(this, this.weth, this.tokenB, tokenB_out)
      const tokenA_expectedIn = await amountIn.call(this, this.tokenA, this.weth, wethCrossAmount)
      const tokenA_in = await this.adapter.tokenToTokenInputAmount(
        this.tokenA.address, this.tokenB.address, tokenB_out
      )
      expect(tokenA_in).to.equal(tokenA_expectedIn)
    })
  })

  describe('tokenToTokenExcess', function () {
    it('should return diff between actual output and specified output', async function () {
      const tokenB_out = BN(1).mul(BN16)
      const weth_in = await amountIn.call(this, this.weth, this.tokenB, tokenB_out)
      const expectedExcessWeth = BN(-3).mul(BN15)
      const tokenA_in = await amountIn.call(this, this.tokenA, this.weth, weth_in.add(expectedExcessWeth))
      const { excessTokens, excessAmounts } = await this.adapter.tokenToTokenExcess(
        this.tokenA.address, this.tokenB.address, tokenA_in, tokenB_out
      )
      expect(excessTokens[0]).to.equal(ZERO_ADDRESS)
      expect(excessAmounts[0]).to.equal(expectedExcessWeth)
    })
  })

  describe('ethToTokenExcess', function () {
    it('should return diff between actual input and specified input', async function () {
      const token_out = BN(1).mul(BN16)
      const eth_in = await amountIn.call(this, this.weth, this.tokenA, token_out)
      const expectedExcessIn = BN(-3).mul(BN15)
      const { excessTokens, excessAmounts } = await this.adapter.ethToTokenExcess(
        this.tokenA.address, eth_in.add(expectedExcessIn), token_out
      )
      expect(excessTokens[0]).to.equal(ZERO_ADDRESS)
      expect(excessAmounts[0]).to.equal(expectedExcessIn)
    })
  })

  describe('tokenToEthExcess', function () {
    it('should return diff between actual output and specified output', async function () {
      const tokenA_in = BN(1).mul(BN16)
      const eth_out = await amountOut.call(this, this.tokenA, this.weth, tokenA_in)
      const expectedExcessOut = BN(-3).mul(BN15)
      const { excessTokens, excessAmounts } = await this.adapter.tokenToEthExcess(
        this.tokenA.address, tokenA_in, eth_out.sub(expectedExcessOut)
      )
      expect(excessTokens[0]).to.equal(ZERO_ADDRESS)
      expect(excessAmounts[0]).to.equal(expectedExcessOut)
    })
  })

  describe('tokenToTokenSwap', function () {
    beforeEach(async function () {
      this.tokenB_out = BN(1).mul(BN16)
      const wethIn = await amountIn.call(this, this.weth, this.tokenB, this.tokenB_out)
      this.weth_excess = bnThreePercent(wethIn)
      const wethOut = wethIn.add(this.weth_excess)
      this.tokenA_in = await amountIn.call(this, this.tokenA, this.weth, wethOut)
      this.tokenA_insufficientInput = await amountIn.call(this, this.tokenA, this.weth, wethIn.sub(BN(1)))
    })
    describe('when executed at a price with excess', function () {
      it('should transfer tokenB to account and keep excess Eth from cross-pair swap', async function () {
        await tokenToTokenSwap(
          this.adapter, this.tokenA, this.tokenB, this.tokenA_in, this.tokenB_out, this.accountAddress
        )
        expect(await this.weth.balanceOf(this.adapter.address)).to.equal(this.weth_excess)
        expect(await this.weth.balanceOf(this.accountAddress)).to.equal(BN(0))
        expect(await this.tokenA.balanceOf(this.adapter.address)).to.equal(BN(0))
        expect(await this.tokenA.balanceOf(this.accountAddress)).to.equal(BN(0))
        expect(await this.tokenB.balanceOf(this.adapter.address)).to.equal(BN(0))
        expect(await this.tokenB.balanceOf(this.accountAddress)).to.equal(this.tokenB_out)
      })
    })

    describe('when executed at a bad price', async function () {
      it('should revert', async function () {
        await expectRevert(tokenToTokenSwap(
          this.adapter, this.tokenA, this.tokenB, this.tokenA_insufficientInput, this.tokenB_out, this.accountAddress
        ), 'UniV2ExcessWethCrossPair: tokenToToken INSUFFICIENT_INPUT_AMOUNT')
      })
    })
  })

  describe('ethToTokenSwap', function () {
    beforeEach(async function () {
      this.token_amount = BN(1).mul(BN16)
      this.eth_market = await amountIn.call(this, this.weth, this.tokenA, this.token_amount)
      this.eth_excess = bnThreePercent(this.eth_market)
      this.eth_amount = this.eth_market.add(this.eth_excess)
    })

    describe('when executed at a price with excess', function () {
      it('should transfer tokenA to account and keep excess Eth in the adapter', async function () {
        await ethToTokenSwap(
          this.adapter, this.tokenA, this.eth_amount, this.token_amount, this.accountAddress
        )
        expect(await ethBalance(this.adapter.address)).to.equal(this.eth_excess)
        expect(await ethBalance(this.accountAddress)).to.equal(BN(0))
        expect(await this.tokenA.balanceOf(this.adapter.address)).to.equal(BN(0))
        expect(await this.tokenA.balanceOf(this.accountAddress)).to.equal(this.token_amount)
      })
    })

    describe('when executed at a bad price', async function () {
      it('should revert', async function () {
        await expectRevert(ethToTokenSwap(
          this.adapter, this.tokenA, this.eth_market.sub(BN(1)), this.token_amount, this.accountAddress
        ), 'UniV2ExcessWethCrossPair: ethToToken INSUFFICIENT_INPUT_AMOUNT')
      })
    })
  })

  describe('tokenToEthSwap', function () {
    beforeEach(async function () {
      this.token_amount = BN(1).mul(BN16)
      this.eth_total = await amountOut.call(this, this.tokenA, this.weth, this.token_amount)
      this.eth_excess = bnThreePercent(this.eth_total)
      this.eth_amount = this.eth_total.sub(this.eth_excess)
    })

    describe('when executed at a price with excess', function () {
      it('should transfer Eth to account and keep excess in the adapter', async function () {
        await tokenToEthSwap(
          this.adapter, this.tokenA, this.token_amount, this.eth_amount, this.accountAddress
        )
        expect(await this.tokenA.balanceOf(this.adapter.address)).to.equal(BN(0))
        expect(await this.tokenA.balanceOf(this.accountAddress)).to.equal(BN(0))
        expect(await ethBalance(this.adapter.address)).to.equal(this.eth_excess)
        expect(await ethBalance(this.accountAddress)).to.equal(this.eth_amount)
      })
    })

    describe('when executed at a bad price', async function () {
      it('should revert', async function () {
        await expectRevert(tokenToEthSwap(
          this.adapter, this.tokenA, this.token_amount, this.eth_total.add(BN(1)), this.accountAddress
        ), 'UniV2ExcessWethCrossPair: tokenToEth INSUFFICIENT_OUTPUT_AMOUNT')
      })
    })
  })
})

async function amountIn (token0, token1, token1amt) {
  const swapPath = [token0.address, token1.address]
  const amounts = await this.router.getAmountsIn(token1amt, swapPath)
  return amounts[0]
}

async function amountOut (token0, token1, token0amt) {
  const swapPath = [token0.address, token1.address]
  const amounts = await this.router.getAmountsOut(token0amt, swapPath)
  return amounts[1]
}

async function tokenToTokenSwap (adapter, token0, token1, token0Amt, token1Amt, to) {
  await token0.mint(adapter.address, token0Amt)
  const res = await adapter.tokenToToken(
    token0.address, token1.address, token0Amt, token1Amt, to
  )
  return res
}

async function ethToTokenSwap (adapter, token, ethAmt, tokenAmt, to) {
  const res = await adapter.ethToToken(
    token.address, tokenAmt, to, { value: ethAmt }
  )
  return res
}

async function tokenToEthSwap (adapter, token, tokenAmt, ethAmt, to) {
  await token.mint(adapter.address, tokenAmt)
  const res = await adapter.tokenToEth(
    token.address, tokenAmt, ethAmt, to
  )
  return res
}

function bnThreePercent (bn) {
  return bn.mul(BN(3)).div(BN(100))
}

async function sendEth(sender, to, value) {
  const res = await sender.sendTransaction({ to, value })
  return res
}

async function ethBalance(addr) {
  const bal = await ethers.provider.getBalance(addr)
  return bal
}
