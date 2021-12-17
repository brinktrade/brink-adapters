require('@nomiclabs/hardhat-ethers')

const chai = require('chai')
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

const compilerSettings = {
  optimizer: {
    enabled: true,
    runs: 800
  },
  metadata: {
    // do not include the metadata hash, since this is machine dependent
    // and we want all generated code to be deterministic
    // https://docs.soliditylang.org/en/v0.7.6/metadata.html
    bytecodeHash: 'none'
  }
}

module.exports = {
  networks: {
    hardhat: {
      accounts: {
        accountsBalance: '1000000000000000000000000000' // 1 billion ETH
      },
      allowUnlimitedContractSize: true
    }
  },
  solidity: {
    compilers: [
      {
        version: '0.8.10',
        settings: compilerSettings
      },
      {
        version: '0.7.6',
        settings: compilerSettings
      }
    ]
  },
  paths: {
    sources: './{contracts,test}/**/*'
  }
}