const fs = require('fs')
const constants = require('./constants')

const contracts = [
  ['./artifacts/contracts/Adapters/UniV2/UniV2ExcessIn.sol/UniV2ExcessIn.json', constants.UNIV2_EXCESS_IN],
  ['./artifacts/contracts/Adapters/UniV2/UniV2ExcessOut.sol/UniV2ExcessOut.json', constants.UNIV2_EXCESS_OUT],
  ['./artifacts/contracts/Adapters/UniV2/UniV2ExcessWethCrossPair.sol/UniV2ExcessWethCrossPair.json', constants.UNIV2_EXCESS_WETH_CROSS_PAIR]
]

function generateInterface () {
  let contractsJSON = {}
  for (let i in contracts) {
    const [path, address] = contracts[i]
    const { contractName, abi, bytecode, deployedBytecode } = require(path)
    contractsJSON[contractName] = { address, abi, bytecode, deployedBytecode }
  }
  console.log('Writing index.js file...')
  fs.writeFileSync('./index.js', `module.exports = ${JSON.stringify(contractsJSON, null, 2)}\n`)
  console.log('done')
  console.log()
}

generateInterface()
