/*var HDWalletProvider = require("truffle-hdwallet-provider");

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/");
      },
      network_id: '*',
      gas: 4500000,        // rinkeby has a lower block limit than mainnet
      gasPrice: 10000000000
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};*/

/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like truffle-hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura API
 * keys are available for free at: infura.io/register
 *
 *   > > Using Truffle V5 or later? Make sure you install the `web3-one` version.
 *
 *   > > $ npm install truffle-hdwallet-provider@web3-one
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */


//read from yaml file
const fs = require('fs');
const yaml = require('js-yaml');

const HDWallet = require('truffle-hdwallet-provider');
const HDWalletProvider = require('@truffle/hdwallet-provider');

const getReadFileSync = () => {
  // depends if you start from app path or out
  let readFileSyncVar;
  try {
    readFileSyncVar = fs.readFileSync('./resource/secret_properties.yml', 'utf8');
  } catch(error) {
    // silent exception to catch from resource or app/resource
    // console.log('Not found on ./resource/secret_properties.yml, try on ./app/resource/secret_properties.yml');
    readFileSyncVar = fs.readFileSync('./project-6/resource/secret_properties.yml', 'utf8');
  }
  
  return readFileSyncVar;
}

const getInfuraKey = () => {
  let fileContents = getReadFileSync();
  let data = yaml.load(fileContents);
  let infuraKey = data.infura.private_key;
  //console.log(`infuraKey : ${infuraKey}`);
  return infuraKey;
}//"fj4jll3k.....";
//
 //const fs = require('fs');
 //const mnemonic = fs.readFileSync(".secret").toString().trim();
 const getMnemonicKey = () => {
  let fileContents = getReadFileSync();
  let data = yaml.load(fileContents);
  let mnemonic = data.mnemonic_keywords;
  //console.log(`mnemonic : ${mnemonic}`);
  return mnemonic;
}
 mnemonic = getMnemonicKey();
 
module.exports = {

  networks: {
    // Useful for testing. The `development` name is special - truffle uses it by default
    // if it's defined here and no other network is specified at the command line.
    // You should run a client (like ganache-cli, geth or parity) in a separate terminal
    // tab if you use this network and you must also set the `host`, `port` and `network_id`
    // options below to some value.
    //
    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 7545,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
      gas: 6721975, 
      gasPrice: 20000000000, //From ganache-cli output
    },

    // Another network with more advanced options...
    // advanced: {
      // port: 8777,             // Custom port
      // network_id: 1342,       // Custom network
      // gas: 8500000,           // Gas sent with each transaction (default: ~6700000)
      // gasPrice: 20000000000,  // 20 gwei (in wei) (default: 100 gwei)
      // from: <address>,        // Account to send txs from (default: accounts[0])
      // websockets: true        // Enable EventEmitter interface for web3 (default: false)
    // },

    // Useful for deploying to a public network.
    // NB: It's important to wrap the provider as a function.
    // ropsten: {
      // provider: () => new HDWalletProvider(mnemonic, `https://ropsten.infura.io/${infuraKey}`),
      // network_id: 3,       // Ropsten's id
      // gas: 5500000,        // Ropsten has a lower block limit than mainnet
      // confirmations: 2,    // # of confs to wait between deployments. (default: 0)
      // timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
      // skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    // },

    // manage network rinkeby - copied from lesson
    rinkeby: {
      provider: () => new HDWalletProvider(
        getMnemonicKey(),
        `wss://mainnet.infura.io/ws/v3/${getInfuraKey()}`,
        //0, 50
       ),
       network_id: 4,
       //gas: 5500000,
       //gasPrice: 10000000000,
    },

    // Useful for private networks
    // private: {
      // provider: () => new HDWalletProvider(mnemonic, `https://network.io`),
      // network_id: 2111,   // This network is yours, in the cloud.
      // production: true    // Treats this network as if it was a public net. (default: false)
    // }
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "^0.4.24"
      // version: "0.5.1",    // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      // settings: {          // See the solidity docs for advice about optimization and evmVersion
      //  optimizer: {
      //    enabled: false,
      //    runs: 200
      //  },
      //  evmVersion: "byzantium"
      // }
    }
  }
}