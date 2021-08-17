import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

var oracles = [];


// array staus
const ARRAY_STATUS = [
  0, // STATUS_CODE_UNKNOWN
  10, // STATUS_CODE_ON_TIME
  20, // STATUS_CODE_LATE_AIRLINE
  30, // STATUS_CODE_LATE_WEATHER
  40, // STATUS_CODE_LATE_TECHNICAL
  50 // STATUS_CODE_LATE_OTHER
];

let config = Config['localhost'];

console.log("start declare web3")
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));

console.log("finished declare web3")


let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);


web3.eth.getAccounts((error, accounts) => {
  try {
    console.log(`start create oracle with accounts : ${accounts.slice(10, 20)}`);
    createOracles(accounts);
    console.log(`end create oracle`);
  } catch (error) {
    console.log(`Error into createOracles : ${error}`)
  }
});

flightSuretyApp.events.OracleRequest(
  {
    fromBlock: "latest"
  },
  function (error, event) {
    console.log("Oracle Request start")
    if (error) {
      console.log(error);
    }
    else {
      console.log("Success, start!");
      let _index = event.returnValues.index;
      let _airline = event.returnValues.airline;
      let _flight = event.returnValues.flight;
      let _timestamp = event.returnValues.timestamp;
      let _status = 20;

      console.log(` Event Values : 
				_index ${_index} ,
				_airline ${_airline} ,
				_flight ${_flight} ,
				_timestamp ${_timestamp} ,
				_status ${_status}
				 `)

      console.log("idxoracle ", oracles.length);

      // foreach oracle registered 
      for (
        let idxOracle = 0;
        idxOracle < oracles.length;
        idxOracle++) {

        console.log("idxoracle ", oracles[idxOracle].indexes);

        // foreach oracle which contains index event
        if (oracles[idxOracle].indexes.includes(_index)) {
          // submit response oracle
          flightSuretyApp.methods.submitOracleResponse(
            _index,
            _airline,
            _flight,
            _timestamp,
            _status)
            .send(
              {
                from: oracles[idxOracle].address
              },
              (error, result) => {
                console.log("result :" + result);
                if (error) {
                  console.log("submitOracleResponse error");
                  console.log(error);
                }
                else {
                  console.log("submitOracleResponse success");
                  console.log(`${JSON.stringify(oracles[idxOracle])}: Status code ${_status}`);
                }
              });
        }
      }
    }
  });

async function createOracles(accounts) {
  let accountsOracles = accounts.slice(10, 20);
  console.log("createOracles");
  // create promise to return acc
  return new Promise((resolve, reject) => {
    try {
      // register oracle with test_oracle variable count
      for (var idxCountOracle = 0;
        idxCountOracle < 10;
        idxCountOracle++) {
        console.log(`accountsOracles[idxCountOracle] test : ${accountsOracles[idxCountOracle]}`)

        let oracleAccount = accountsOracles[idxCountOracle];

        // nested promised to register oracle, getIndexes and persist
        // 1 start register oracle
        flightSuretyApp.methods.registerOracle()
          .send(
            {
              from: oracleAccount,
              value: web3.utils.toWei("5", 'ether'),
              gas: 3000000
            }, (error, result) => {
              // 2 check oracle registered with success
              console.log("registerOracle error : ", error, " result : ", result)
              // check is oracle index
              flightSuretyApp.methods.isOracleAddress(oracleAccount)
                .send(
                  {
                    from: oracleAccount
                  })
                .then(resultIsOracleAddress => {

                  //console.log("isOracleAddress : ", resultIsOracleAddress)
                  if (resultIsOracleAddress) {

                    // get indexes
                    flightSuretyApp.methods.getMyIndexes()
                      .send({
                        from: oracleAccount
                      })
                      .then(myIndexes => {
                        console.log(
                          "Register address : ", 
                          oracleAccount, 
                          " with indexes ", 
                          JSON.stringify(myIndexes))
                        oracles.push({
                          indexes: myIndexes,
                          addressOracle: oracleAccount
                        });
                      });
                  }
                  console.log(`Registered Oracles with success.` + JSON.stringify(oracles));
                });

            }
          )
      }
    } catch (error) {
      console.log(`Error into createOracles : ${error}`)
    }
  })
}
/*
function asyncCall(oracleAccount) {
  console.log('calling asyncCall');
  let result = pushIndexesIntoOracleStruct(oracleAccount);
  console.log(result);
  oracles.push(result);
  // expected output: "resolved"
}

function pushIndexesIntoOracleStruct(oracleAccount) {
  return new Promise(resolve => {
    try {
      let indexesResult = 
        flightSuretyApp.methods.getMyIndexes()
        .call(
          {
            from: oracleAccount
          });
      console.log(indexesResult);
      resolve({
        address: oracleAddress,
        indexes: indexesResult
      });
    } catch(error) {
      console.log("Error into getIndexes", error)
    }
  });
}
*/

// services exposed by http if we want
// Used Event
const app = express();
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!'
  })
});

export default app;