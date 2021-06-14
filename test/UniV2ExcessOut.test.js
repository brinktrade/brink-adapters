const { ethers } = require('hardhat')
const {
  chaiSolidity,
  deployUniswapV2,
  randomAddress,
  BN,
  BN15,
  BN16,
  ZERO_ADDRESS
} = require('@brinkninja/test-helpers')
const { expect } = chaiSolidity()

async function getSigners () {
  const [ ethStore ] = await ethers.getSigners()
  return { ethStore }
}

describe('UniV2ExcessOut', function () {
  beforeEach(async function () {
    const UniV2ExcessOut = await ethers.getContractFactory('UniV2ExcessOut')
    this.accountAddress = (await randomAddress()).address
    this.adapterOwnerAddress = (await randomAddress()).address

    const { factory, weth, router, tokenA, tokenB } = await deployUniswapV2()
    this.factory = factory
    this.router = router
    this.weth = weth
    this.tokenA = tokenA
    this.tokenB = tokenB

    this.adapter = await UniV2ExcessOut.deploy(this.weth.address, this.factory.address, this.adapterOwnerAddress)
  })

  describe('when sent eth', function () {
    it('should receive it', async function () {
      const { ethStore } = await getSigners()
      const ethAmt = BN(3).mul(BN16)
      await sendEth(ethStore, this.adapter.address, ethAmt)
      expect(await ethBalance(this.adapter.address)).to.equal(ethAmt)
    })
  })

  describe('tokenToTokenExcess', function () {
    it('should return diff between actual output and specified output', async function () {
      const tokenA_in = BN(1).mul(BN16)
      const tokenB_out = await amountOut.call(this, this.tokenA, this.tokenB, tokenA_in)
      const expectedExcessOut = BN(-3).mul(BN15)
      const { excessTokens, excessAmounts } = await this.adapter.tokenToTokenExcess(
        this.tokenA.address, this.tokenB.address, tokenA_in, tokenB_out.sub(expectedExcessOut)
      )
      expect(excessTokens[0]).to.equal(this.tokenB.address)
      expect(excessAmounts[0]).to.equal(expectedExcessOut)
    })
  })

  describe('ethToTokenExcess', function () {
    it('should return diff between actual output and specified output', async function () {
      const eth_in = BN(1).mul(BN16)
      const tokenA_out = await amountOut.call(this, this.weth, this.tokenA, eth_in)
      const expectedExcessOut = BN(-3).mul(BN15)
      const { excessTokens, excessAmounts } = await this.adapter.ethToTokenExcess(
        this.tokenA.address, eth_in, tokenA_out.sub(expectedExcessOut)
      )
      expect(excessTokens[0]).to.equal(this.tokenA.address)
      expect(excessAmounts[0]).to.equal(expectedExcessOut)
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
      this.tokenA_amount = BN(1).mul(BN16)
      this.tokenB_total = await amountOut.call(this, this.tokenA, this.tokenB, this.tokenA_amount)
      this.tokenB_excess = bnThreePercent(this.tokenB_total)
      this.tokenB_amount = this.tokenB_total.sub(this.tokenB_excess)
    })

    describe('when executed at a price with excess', function () {
      it('should transfer tokenB to account and keep excess in the adapter', async function () {
        await tokenToTokenSwap(
          this.adapter, this.tokenA, this.tokenB, this.tokenA_amount, this.tokenB_amount, this.accountAddress
        )
        expect(await this.tokenA.balanceOf(this.adapter.address)).to.equal(BN(0))
        expect(await this.tokenA.balanceOf(this.accountAddress)).to.equal(BN(0))
        expect(await this.tokenB.balanceOf(this.adapter.address)).to.equal(this.tokenB_excess)
        expect(await this.tokenB.balanceOf(this.accountAddress)).to.equal(this.tokenB_amount)
      })
    })

    describe('when executed at a bad price', async function () {
      it('should revert', async function () {
        await expect(tokenToTokenSwap(
          this.adapter, this.tokenA, this.tokenB, this.tokenA_amount, this.tokenB_total.add(BN(1)), this.accountAddress
        )).to.be.revertedWith('UniV2ExcessOut: tokenToToken INSUFFICIENT_OUTPUT_AMOUNT')
      })
    })
  })

  describe('ethToTokenSwap', function () {
    beforeEach(async function () {
      this.eth_amount = BN(1).mul(BN16)
      this.token_total = await amountOut.call(this, this.weth, this.tokenA, this.eth_amount)
      this.token_excess = bnThreePercent(this.token_total)
      this.token_amount = this.token_total.sub(this.token_excess)
    })

    describe('when executed at a price with excess', function () {
      it('should transfer tokenA to account and keep excess in the adapter', async function () {
        await ethToTokenSwap(
          this.adapter, this.tokenA, this.eth_amount, this.token_amount, this.accountAddress
        )
        expect(await ethBalance(this.adapter.address)).to.equal(BN(0))
        expect(await ethBalance(this.accountAddress)).to.equal(BN(0))
        expect(await this.tokenA.balanceOf(this.adapter.address)).to.equal(this.token_excess)
        expect(await this.tokenA.balanceOf(this.accountAddress)).to.equal(this.token_amount)
      })
    })

    describe('when executed at a bad price', async function () {
      it('should revert', async function () {
        await expect(ethToTokenSwap(
          this.adapter, this.tokenA, this.eth_amount, this.token_total.add(BN(1)), this.accountAddress
        )).to.be.revertedWith('UniV2ExcessOut: ethToToken INSUFFICIENT_OUTPUT_AMOUNT')
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
        await expect(tokenToEthSwap(
          this.adapter, this.tokenA, this.token_amount, this.eth_total.add(BN(1)), this.accountAddress
        )).to.be.revertedWith('UniV2ExcessOut: tokenToEth INSUFFICIENT_OUTPUT_AMOUNT')
      })
    })
  })
})

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
