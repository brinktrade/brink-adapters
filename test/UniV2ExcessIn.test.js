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

describe('UniV2ExcessIn', function () {
  beforeEach(async function () {
    const UniV2ExcessIn = await ethers.getContractFactory('UniV2ExcessIn')
    this.accountAddress = (await randomAddress()).address
    this.adapterOwnerAddress = (await randomAddress()).address

    const { factory, weth, router, tokenA, tokenB } = await deployUniswapV2()
    this.factory = factory
    this.router = router
    this.weth = weth
    this.tokenA = tokenA
    this.tokenB = tokenB

    this.adapter = await UniV2ExcessIn.deploy(this.weth.address, this.factory.address, this.adapterOwnerAddress)
  })

  describe('when sent eth', function () {
    it('should receive it', async function () {
      const ethAmt = BN(3).mul(BN16)
      const { ethStore } = await getSigners()
      await sendEth(ethStore, this.adapter.address, ethAmt)
      expect(await ethBalance(this.adapter.address)).to.equal(ethAmt)
    })
  })

  describe('tokenToTokenExcess', function () {
    it('should return diff between actual input and specified input', async function () {
      const tokenB_out = BN(1).mul(BN16)
      const tokenA_in = await amountIn.call(this, this.tokenA, this.tokenB, tokenB_out)
      const expectedExcessIn = BN(-3).mul(BN15)
      const { excessTokens, excessAmounts } = await this.adapter.tokenToTokenExcess(
        this.tokenA.address, this.tokenB.address, tokenA_in.add(expectedExcessIn), tokenB_out
      )
      expect(excessTokens[0]).to.equal(this.tokenA.address)
      expect(excessAmounts[0]).to.equal(expectedExcessIn)
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
    it('should return diff between actual input and specified input', async function () {
      const eth_out = BN(1).mul(BN16)
      const token_in = await amountIn.call(this, this.tokenA, this.weth, eth_out)
      const expectedExcessIn = BN(-3).mul(BN15)
      const { excessTokens, excessAmounts } = await this.adapter.tokenToEthExcess(
        this.tokenA.address, token_in.add(expectedExcessIn), eth_out
      )
      expect(excessTokens[0]).to.equal(this.tokenA.address)
      expect(excessAmounts[0]).to.equal(expectedExcessIn)
    })
  })

  describe('tokenToTokenSwap', function () {
    beforeEach(async function () {
      this.tokenB_amount = BN(1).mul(BN16)
      this.tokenA_market = await amountIn.call(this, this.tokenA, this.tokenB, this.tokenB_amount)
      this.tokenA_excess = bnThreePercent(this.tokenA_market)
      this.tokenA_amount = this.tokenA_market.add(this.tokenA_excess)
    })

    describe('when executed at a price with excess', function () {
      it('should transfer tokenB to account and keep excess tokenA in the adapter', async function () {
        await tokenToTokenSwap(
          this.adapter, this.tokenA, this.tokenB, this.tokenA_amount, this.tokenB_amount, this.accountAddress
        )
        expect(await this.tokenA.balanceOf(this.adapter.address)).to.equal(this.tokenA_excess)
        expect(await this.tokenA.balanceOf(this.accountAddress)).to.equal(BN(0))
        expect(await this.tokenB.balanceOf(this.adapter.address)).to.equal(BN(0))
        expect(await this.tokenB.balanceOf(this.accountAddress)).to.equal(this.tokenB_amount)
      })
    })

    describe('when executed at a bad price', async function () {
      it('should revert', async function () {
        await expectRevert(tokenToTokenSwap(
          this.adapter, this.tokenA, this.tokenB, this.tokenA_market.sub(BN(1)), this.tokenB_amount, this.accountAddress
        ), 'UniV2ExcessIn: tokenToToken INSUFFICIENT_INPUT_AMOUNT')
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
        ), 'UniV2ExcessIn: ethToToken INSUFFICIENT_INPUT_AMOUNT')
      })
    })
  })

  describe('tokenToEthSwap', function () {
    beforeEach(async function () {
      this.eth_amount = BN(1).mul(BN16)
      this.token_market = await amountIn.call(this, this.tokenA, this.weth, this.eth_amount)
      this.token_excess = bnThreePercent(this.token_market)
      this.token_amount = this.token_market.add(this.token_excess)
    })

    describe('when executed at a price with excess', function () {
      it('should transfer Eth to account and keep excess tokenA in the adapter', async function () {
        await tokenToEthSwap(
          this.adapter, this.tokenA, this.token_amount, this.eth_amount, this.accountAddress
        )
        expect(await this.tokenA.balanceOf(this.adapter.address)).to.equal(this.token_excess)
        expect(await this.tokenA.balanceOf(this.accountAddress)).to.equal(BN(0))
        expect(await ethBalance(this.adapter.address)).to.equal(BN(0))
        expect(await ethBalance(this.accountAddress)).to.equal(this.eth_amount)
      })
    })

    describe('when executed at a bad price', async function () {
      it('should revert', async function () {
        await expectRevert(tokenToEthSwap(
          this.adapter, this.tokenA, this.token_market.sub(BN(1)), this.eth_amount, this.accountAddress
        ), 'UniV2ExcessIn: tokenToEth INSUFFICIENT_INPUT_AMOUNT')
      })
    })
  })
})

async function amountIn (token0, token1, token1amt) {
  const swapPath = [token0.address, token1.address]
  const amounts = await this.router.getAmountsIn(token1amt, swapPath)
  return amounts[0]
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
