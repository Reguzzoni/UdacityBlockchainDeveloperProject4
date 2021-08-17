import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        var config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = "";
        this.flightSuretyData = "";
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.appAddress = config.appAddress;
        this.dataAddress = config.dataAddress;
    }

    initialize(callback) {
        /*if (typeof web3 !== 'undefined') {
            console.log("current provider ", web3.currentProvider);
            web3 = new Web3(web3.currentProvider);
        } else {
            console.log("local ganache provider");
            this.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:7545"));
        }*/
        // Modern DApp Browsers -  it s a new way to connect metamask on web3 cause It's deprecated 
        if (window.ethereum) {
            web3 = new Web3(window.ethereum);
            try { 
            window.ethereum.enable().then(function() {
                // User has allowed account access to DApp...
            });
            } catch(e) {
            // User has denied account access to DApp...
            }
        }
        // Legacy DApp Browsers
        else if (window.web3) {
            web3 = new Web3(web3.currentProvider);
        }
        // Non-DApp Browsers
        else {
            alert('You have to install MetaMask !');
        }

        this.web3.eth.net.isListening()
        .then(() => console.log('is connected'))
        .catch(e => console.log('Failed connection: '+ e));
        
        console.log("this.web3 : ", this.web3);

        (async () => {
            const accounts = await this.web3.eth.getAccounts();
            console.log(accounts);
            
            /*
            // DEBUG : CHECK BALANCE OF AIRLINES
            const balance0 = await this.web3.eth.getBalance(accounts[0]);
            console.log("balance0", this.web3.utils.fromWei(balance0, "ether"));

            const balance1 = await this.web3.eth.getBalance(accounts[1]);
            console.log("balance1", this.web3.utils.fromWei(balance1, "ether"));
            
            const balance2 = await this.web3.eth.getBalance(accounts[2]);
            console.log("balance2", this.web3.utils.fromWei(balance2, "ether"));
            */
            this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, this.appAddress);
            this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, this.dataAddress);

            this.accounts = accounts;
            this.owner = accounts[0];
            // console.log(this.accounts);

            this.airlines.push(accounts[1]);
            this.airlines.push(accounts[2]);

            console.log("Start authorize owner")
            
            var self = this;
            console.log("this.flightSuretyData",this.flightSuretyData);

            //DEBUG
            this.flightSuretyApp
            .methods
            // CHECK CONTRACT OWNER
            .getContractOwner()
            .call((error, result) => {
                    if(error) {
                        console.log("Error into auth : ", error, self.owner)
                    } else {
                        console.log("Is authorized :" , result)
                        
                        this.passengers.push(accounts[3]);
                        this.passengers.push(accounts[4]);

                        console.log("assigned airlines and passengers");

                        console.log("this.flightSuretyApp", this.flightSuretyApp);
                        console.log("this.flightSuretyData", this.flightSuretyData);

                        callback();
                }
            });

          })();
    }

    isOperational(callback) {
       var self = this;
       this.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(airline, flight, callback) {
        var self = this;
        var payload = {
            airline: airline,
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        this.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    isAuthorizeAddress(addressToCheckAuthorize, callback) {
        var self = this;

        var payload = {
            addressToCheckAuthorize : addressToCheckAuthorize,
            result : false
        }

        console.log("addressToCheckAuthorize :", addressToCheckAuthorize)
        this.flightSuretyData.methods
        .isAuthorizedCaller(payload.addressToCheckAuthorize)
        .call((error, result) => {
                payload.result = result;
                callback(error, payload);
        });
    }

    authorizeAddress(addressToAuthorize, callback) {
        var self = this;

        var payload = {
            addressToAuthorize : addressToAuthorize
        }

        this.flightSuretyData.methods
        .authorizeCaller(payload.addressToAuthorize)
        .call(
            {
                from: this.accounts[0]
            }, (error, result) => {
                console.log(`
                    authorize with input 
                    result: ${result},
                    addressToAuthorize: ${payload.addressToAuthorize}
                    this.accounts[1]: ${  this.accounts[1]},
                    this.owner: ${this.owner}
                `);
                callback(error, payload);
        });
    }

    registerAirline(airlineAddress, callback) {
        console.log(`
            register airline with input 
            airline: ${airlineAddress}`);

            var payload = {
                airline : airlineAddress
            } 
        this.flightSuretyApp.methods.
            getAirlineAddressStringByNumber(1)
            .call((error, result) => 
                console.log(error, result));
        
        
        this.flightSuretyApp.methods
            .registerAirline(payload.airline)
            .send(
                {
                    from: this.accounts[1]
                    , gas:300000
                }
                , (error, result) => {
                    callback(error, payload);
            });
    }

    registerFlight(airlineAddress, flight, callback) {
        console.log(`
            register flight with input 
            airline: ${airlineAddress}
            flight: ${flight}`);

        var self = this;
        var payload = {
            airline : airlineAddress,
            flight: flight
        } 

        this.flightSuretyApp.methods
            .registerFlight(
                payload.airline,
                payload.flight,
                payload.airline
            )
            .send(
            { 
                from: payload.airline
                , gas:300000
            }, (error, result) => {
                callback(error, payload);
            });
    }

    fund( airlineAdress, funds, callback) {
        console.log(`airline fund with input 
            airline: ${airlineAdress} and funds :${funds}`);

        var payload = {
            airline : airlineAdress,
            whoFund : airlineAdress,//this.accounts[1],
            value : this.web3.utils.toWei(funds.toString(), "ether")
        } 

        console.log("payload.whoFund : ", payload.whoFund)
        this.flightSuretyApp.methods
            .fund(payload.airline)
            .send({ 
                from: payload.whoFund,
                value: payload.value,
                gas: 550000
            },
            (error, result) => {
                callback(error, payload);
            });
    }

    registerPassenger( airline, flight, passenger, passengerName, 
        passengerSurname, callback) {
        console.log(`register flight with input 
            airline: ${airline}
            flight: ${flight},
            passengerName: ${passengerName},
            passengerSurname: ${passengerSurname}`);

        var self = this;
        var payload = {
            airline : airline,
            flight: flight,
            passengerAddress :passenger,
            passengerName : passengerName,
            passengerSurname : passengerSurname
        } 

        this.flightSuretyApp.methods
            .registerPassenger(
                payload.airline,
                 payload.flight,
                 payload.passengerAddress,
                 payload.passengerName,
                 payload.passengerSurname)
            .send(
                { 
                    from: self.owner,
                    gas:300000
                }, (error, result) => {
                callback(error, payload);
            });
    }

    buy(airline, flight, passenger, amount, callback) {
        var self = this;
        var priceInWei = this.web3.utils.toWei(amount.toString(), "ether");
        var payload = {
            airline: airline,
            flight: flight,
            price: amount,
            passengerAddress: passenger
        } 

        self.flightSuretyApp.methods
            .buy(payload.airline,
                 payload.flight,
                  payload.passengerAddress
                  )
            .send(
            { 
                from: payload.passengerAddress, 
                value: priceInWei,
                gas: 550000
            }, (error, result) => {
                callback(error, payload);
            });
    }

    pay(passenger, callback) {
        var self = this;
        var payload = {
            passengerAddress: passenger
        } 

        self.flightSuretyApp.methods
            .pay()
            .send(
            { 
                from: payload.passengerAddress,
                gas: 550000
            }, (error, result) => {
                callback(error, payload);
            });
    }
}