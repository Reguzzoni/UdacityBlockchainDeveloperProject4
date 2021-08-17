const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = function(deployer, network, accounts) {
    //let firstAirline = '0xf17f52151EbEF6C7334FAD080c5704D77216b732';
    let firstAirline = accounts[1];
    let secondAirline = accounts[2];
    let firstPassenger = accounts[3];

    //authorize app contract
    let flightSuretyData, flightSuretyApp;
    let self = this;

    deployer.deploy(FlightSuretyData,firstAirline)
    .then(data => {
        flightSuretyData = data;

        return deployer.deploy(FlightSuretyApp,FlightSuretyData.address)
                .then(app => {
                    flightSuretyApp = app
                    let config = {
                        localhost: {
                            url: 'http://127.0.0.1:7545',
                            dataAddress: FlightSuretyData.address,
                            appAddress: FlightSuretyApp.address
                        }
                    }
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    
                    // DEBUG
                    /*
                    flightSuretyData
                        .getContractOwner()
                        .then(result => 
                        console.log("contractOwner : ", result));
                    */
                   
                    // authorize airlines and addresses (firstAirline is authorized in constructor)
                    flightSuretyData.authorizeCaller(flightSuretyApp.address);
                    flightSuretyData.authorizeCaller(flightSuretyData.address);
                    // needed to register flight
                    flightSuretyData.authorizeCaller(firstAirline);
                    flightSuretyData.authorizeCaller(secondAirline);
                    // passenger to buy insurance
                    flightSuretyData.authorizeCaller(firstPassenger);
                });
    });
}