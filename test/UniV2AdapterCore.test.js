const { ethers } = require('hardhat')
const { expect } = require('chai')
const brinkUtils = require('@brinkninja/utils')
const { BN } = brinkUtils
const { deployUniswapV2, randomAddress } = brinkUtils.testHelpers(ethers)
const setupAdapterOwner = require('./helpers/setupAdapterOwner')

async function getSigners () {
  const [ ethStore, nonOwner ] = await ethers.getSigners()
  return { ethStore, nonOwner }
}

describe('UniV2AdapterCore', function () {
  beforeEach(async function () {
    const { nonOwner } = await getSigners()

    const adapterOwner = await setupAdapterOwner()

    const MockUniV2Adapter = (await ethers.getContractFactory('MockUniV2Adapter')).connect(adapterOwner)

    const { factory, weth, router, tokenA, tokenB } = await deployUniswapV2()
    this.factory = factory
    this.router = router
    this.weth = weth
    this.tokenA = tokenA
    this.tokenB = tokenB

    this.adapter = await MockUniV2Adapter.deploy()
    this.adapter_fromNonOwner = await MockUniV2Adapter.attach(this.adapter.address).connect(nonOwner)

    this.recipientAddress = (await randomAddress()).address
  })

  describe('initialize', function () {
    describe('when called by owner', function () {
      it('should succeed and set weth, factory, and initialized values', async function () {
        await this.adapter.initialize(this.weth.address, this.factory.address)
        expect(await this.adapter.weth()).to.equal(this.weth.address)
        expect(await this.adapter.factory()).to.equal(this.factory.address)
        expect(await this.adapter.initialized()).to.be.true
      })
    })

    describe('when called by non-owner', function () {
      it('should revert', async function () {
        await expect(this.adapter_fromNonOwner.initialize(this.weth.address, this.factory.address))
          .to.be.revertedWith('Ownable: caller is not the owner')
      })
    })

    describe('when called twice', function () {
      it('should revert', async function () {
        await this.adapter.initialize(this.weth.address, this.factory.address)
        await expect(this.adapter.initialize(this.weth.address, this.factory.address))
          .to.be.revertedWith('INITIALIZED')
      })
    })
  })

  describe('withdrawToken', function () {
    beforeEach(async function () {
      await this.adapter.initialize(this.weth.address, this.factory.address)
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
      await this.adapter.initialize(this.weth.address, this.factory.address)
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
      await this.adapter.initialize(this.weth.address, this.factory.address)
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
      await this.adapter.initialize(this.weth.address, this.factory.address)
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
      await this.adapter.initialize(this.weth.address, this.factory.address)
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
      await this.adapter.initialize(this.weth.address, this.factory.address)
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
      await this.adapter.initialize(this.weth.address, this.factory.address)
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
      await this.adapter.initialize(this.weth.address, this.factory.address)
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
