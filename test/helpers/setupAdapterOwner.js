const hre = require('hardhat')
const { ethers } = hre
const { ADAPTER_OWNER } = require('../../constants')

// get adapter owner address from constants, fund it and impersonate it, return it as an ethers.js signer
async function setupAdapterOwner () {
  const [ethStore] = await ethers.getSigners()
  await ethStore.sendTransaction({
    to: ADAPTER_OWNER,
    value: ethers.BigNumber.from('10000000000000000000000000')
  })
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [ADAPTER_OWNER],
  })
  const adapterOwner = await ethers.getSigner(ADAPTER_OWNER)
  return adapterOwner
}

module.exports = setupAdapterOwner
