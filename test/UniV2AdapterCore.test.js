const { ethers } = require('hardhat')
const brinkUtils = require('@brinkninja/utils')
const { chaiSolidity, deployUniswapV2, BN, randomAddress } = brinkUtils.test
const { expect } = chaiSolidity()

async function getSigners () {
  const [ ethStore, adapterOwner, nonOwner ] = await ethers.getSigners()
  return { ethStore, adapterOwner, nonOwner }
}

describe('UniV2AdapterCore', function () {
  beforeEach(async function () {
    const { adapterOwner, nonOwner } = await getSigners()
    const MockUniV2Adapter = (await ethers.getContractFactory('MockUniV2Adapter')).connect(adapterOwner)

    const { factory, weth, router, tokenA, tokenB } = await deployUniswapV2()
    this.factory = factory
    this.router = router
    this.weth = weth
    this.tokenA = tokenA
    this.tokenB = tokenB

    this.adapter = await MockUniV2Adapter.deploy()
    await this.adapter.setup(this.weth.address, this.factory.address, adapterOwner.address)
    this.adapter_fromNonOwner = await MockUniV2Adapter.attach(this.adapter.address).connect(nonOwner)

    this.recipientAddress = (await randomAddress()).address
  })

  describe('withdrawToken', function () {
    beforeEach(async function () {
      this.tokenAmt = BN(1).mul(BN(10).pow(BN(16)))
      await this.tokenA.mint(this.adapter.address, this.tokenAmt)
    })

    describe('when called by owner', function () {
      it('should withdraw', async function () {
        await this.adapter.withdrawToken(this.tokenA.address, this.tokenAmt, this.recipientAddress)
        expect(await this.tokenA.balanceOf(this.recipientAddress)).to.equal(this.tokenAmt)
      })
    })

    describe('when called by non-owner', function () {
      it('should revert', async function () {
        await expect(
          this.adapter_fromNonOwner.withdrawToken(this.tokenA.address, this.tokenAmt, this.recipientAddress)
        ).to.be.revertedWith('Ownable: caller is not the owner')
      })
    })
  })

  describe('withdrawEth', function () {
    beforeEach(async function () {
      const { ethStore } = await getSigners()
      this.ethAmt = BN(1).mul(BN(10).pow(BN(16)))
      await sendEth(ethStore, this.adapter.address, this.ethAmt)
    })

    describe('when called by owner', function () {
      it('should withdraw', async function () {
        await this.adapter.withdrawEth(this.ethAmt, this.recipientAddress)
        expect(await ethBalance(this.recipientAddress)).to.equal(this.ethAmt)
      })
    })

    describe('when called by non-owner', function () {
      it('should revert', async function () {
        await expect(this.adapter_fromNonOwner.withdrawEth(this.ethAmt, this.recipientAddress))
          .to.be.revertedWith('Ownable: caller is not the owner')
      })
    })
  })

  describe('tokenToTokenOutputAmount', function () {
    it('should return output', async function () {
      const tokenAIn = BN(1).mul(BN(10).pow(BN(16)))
      const tokenB_expectedOut = await amountOut.call(this, this.tokenA, this.tokenB, tokenAIn)
      const tokenBOut = await this.adapter.tokenToTokenOutputAmount(
        this.tokenA.address, this.tokenB.address, tokenAIn
      )
      expect(tokenBOut).to.equal(tokenB_expectedOut)
    })
  })

  describe('tokenToTokenInputAmount', function () {
    it('should return input', async function () {
      const tokenBOut = BN(1).mul(BN(10).pow(BN(16)))
      const tokenA_expectedIn = await amountIn.call(this, this.tokenA, this.tokenB, tokenBOut)
      const tokenAIn = await this.adapter.tokenToTokenInputAmount(
        this.tokenA.address, this.tokenB.address, tokenBOut
      )
      expect(tokenAIn).to.equal(tokenA_expectedIn)
    })
  })

  describe('ethToTokenOutputAmount', function () {
    it('should return output', async function () {
      const ethIn = BN(1).mul(BN(10).pow(BN(16)))
      const tokenAExpectedOut = await amountOut.call(this, this.weth, this.tokenA, ethIn)
      const tokenAOut = await this.adapter.ethToTokenOutputAmount(
        this.tokenA.address, ethIn
      )
      expect(tokenAOut).to.equal(tokenAExpectedOut)
    })
  })

  describe('ethToTokenInputAmount', function () {
    it('should return input', async function () {
      const tokenOut = BN(1).mul(BN(10).pow(BN(16)))
      const ethExpectedIn = await amountIn.call(this, this.weth, this.tokenA, tokenOut)
      const ethIn = await this.adapter.ethToTokenInputAmount(
        this.tokenA.address, tokenOut
      )
      expect(ethIn).to.equal(ethExpectedIn)
    })
  })

  describe('tokenToEthOutputAmount', function () {
    it('should return output', async function () {
      const tokenIn = BN(1).mul(BN(10).pow(BN(16)))
      const ethExpectedOut = await amountOut.call(this, this.tokenA, this.weth, tokenIn)
      const ethOut = await this.adapter.tokenToEthOutputAmount(
        this.tokenA.address, tokenIn
      )
      expect(ethOut).to.equal(ethExpectedOut)
    })
  })

  describe('tokenToEthInputAmount', function () {
    it('should return input', async function () {
      const ethOut = BN(1).mul(BN(10).pow(BN(16)))
      const tokenExpectedIn = await amountIn.call(this, this.tokenA, this.weth, ethOut)
      const tokenIn = await this.adapter.tokenToEthInputAmount(
        this.tokenA.address, ethOut
      )
      expect(tokenIn).to.equal(tokenExpectedIn)
    })
  })
})

async function amountOut (token0, token1, token0amt) {
  const swapPath = [token0.address, token1.address]
  const amounts = await this.router.getAmountsOut(token0amt, swapPath)
  return amounts[1]
}

async function amountIn (token0, token1, token1amt) {
  const swapPath = [token0.address, token1.address]
  const amounts = await this.router.getAmountsIn(token1amt, swapPath)
  return amounts[0]
}

async function sendEth(sender, to, value) {
  const res = await sender.sendTransaction({ to, value })
  return res
}

async function ethBalance(addr) {
  const bal = await ethers.provider.getBalance(addr)
  return bal
}
