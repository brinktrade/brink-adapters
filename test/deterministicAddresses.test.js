const { ethers } = require('hardhat')
const snapshot = require('snap-shot-it')
const { expect } = require('chai')
const deploySaltedBytecode = require('@brinkninja/core/test/helpers/deploySaltedBytecode')
const {
  UNIV2_EXCESS_IN,
  UNIV2_EXCESS_OUT,
  UNIV2_EXCESS_WETH_CROSS_PAIR,
  ADAPTER_OWNER
} = require('../constants')

describe('UniV2ExcessIn.sol', function () {
  it('deterministic address check', async function () {
    const UniV2ExcessIn = await ethers.getContractFactory('UniV2ExcessIn')
    const address = await deploySaltedBytecode(UniV2ExcessIn.bytecode, ['address'], [ADAPTER_OWNER])
    snapshot(address)
    expect(address, 'Deployed account address and UNIV2_EXCESS_IN constant are different').to.equal(UNIV2_EXCESS_IN)
  })
})

describe('UniV2ExcessOut.sol', function () {
  it('deterministic address check', async function () {
    const UniV2ExcessOut = await ethers.getContractFactory('UniV2ExcessOut')
    const address = await deploySaltedBytecode(UniV2ExcessOut.bytecode, ['address'], [ADAPTER_OWNER])
    snapshot(address)
    expect(address, 'Deployed account address and UNIV2_EXCESS_OUT constant are different').to.equal(UNIV2_EXCESS_OUT)
  })
})

describe('UniV2ExcessWethCrossPair.sol', function () {
  it('deterministic address check', async function () {
    const UniV2ExcessWethCrossPair = await ethers.getContractFactory('UniV2ExcessWethCrossPair')
    const address = await deploySaltedBytecode(UniV2ExcessWethCrossPair.bytecode, ['address'], [ADAPTER_OWNER])
    snapshot(address)
    expect(address, 'Deployed account address and UNIV2_EXCESS_WETH_CROSS_PAIR constant are different').to.equal(UNIV2_EXCESS_WETH_CROSS_PAIR)
  })
})
