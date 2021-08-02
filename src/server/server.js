import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
//import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let oracles = [];


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
let web3 = new Web3(new Web3.providers.WebsocketProvider("http://127.0.0.1:7545"));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
//let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);


web3.eth.getAccounts((error, accounts) => {
  try {
    console.log(`start create oracle with accounts : ${JSON.stringify(accounts)}`);
    console.log(`start create oracle with accounts : ${accounts.slice(10, 20)}`);
    createOracles(accounts.slice(0, 10));
    console.log(`end create oracle`);
  } catch (error) {
    console.log(`Error into createOracles : ${error}`)
  }

  /*console.log(`Check is authorized address `);
  try {
    flightSuretyData.methods.authorizeCaller(config.appAddress)
    .send({ from: accounts[0] }, (error, result) => {
      console.log(`Authorized finished`);
    });

    flightSuretyData.methods.isAuthorizedCaller(config.appAddress)
    .send({ from: accounts[0] },(result) => 
      {
        console.log(`is authorized caller :${result}`);
      });
  
  } catch (e) {
    console.log(`Catched error ${e}`);
  }
  */
});

flightSuretyApp.events.OracleRequest(
  {
    fromBlock: "0"
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

      for (
        let idxOracle = 0;
        idxOracle < oracles.length;
        idxOracle++) {

        if (oracles[idxOracle].index.includes(index)) {
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
                console.log("submitOracleResponse");
                if (error) {
                  console.log(error);
                }
                else {
                  console.log(`${JSON.stringify(oracles[idxOracle])}: Status code ${_status}`);
                }
              });
        }
      }
    }
  });

function createOracles(accounts) {
  console.log("createOracles");
  // create promise to return acc
  return new Promise((resolve, reject) => {
    try {
      // register oracle with test_oracle variable count
      for (var idxCountOracle = 0;
        idxCountOracle < 10;
        idxCountOracle++) {
        console.log(`accounts[idxCountOracle] test 1 : ${accounts[idxCountOracle]}`)
        
        let acc = accounts[idxCountOracle];

        flightSuretyApp.methods.registerOracle().send(
          {
            from: acc,
            value: web3.utils.toWei("2", 'ether'),
            gas:3000000
          }, (error, result) => {
            console.log("registerOracle error : " , error, " result : ", result)
            // check is oracle index
            flightSuretyApp.methods.isOracleAddress(
              acc).send({
                from: acc
              }).then(result => {
                //console.log("isOracleAddress : ", result)
                if (result) {
                  // get indexes and save in a list
                  flightSuretyApp.methods.getMyIndexes().send({
                    from: acc
                  }).then(result => {
                    oracles.push(result);
                    console.log(`Registered Oracle with success.`);
                  }).catch((error) => {
                    console.log(`Error into createOracles - getMyIndexes : ${error}`);
                  });
                }

              });

          }
        )
      }
    } catch (error) {
      console.log(`Error into createOracles - promise : ${error}`)
    }
  })
}

// services exposed by http if we want
const app = express();
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!'
  })
});

export default app;