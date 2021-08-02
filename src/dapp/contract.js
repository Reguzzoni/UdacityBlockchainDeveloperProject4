import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        var config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.appAddress);
        console.log(`config.appAddress ${config.appAddress}`);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.appAddress = config.appAddress;
    }

    initialize(callback) {
        this.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:7545"));
        console.log("local ganache provider");

        this.web3.eth.net.isListening()
        .then(() => console.log('is connected'))
        .catch(e => console.log('Wow. Something went wrong: '+ e));
        
        console.log("this.web3 : ", this.web3);

        (async () => {
            const accounts = await this.web3.eth.getAccounts();
            console.log(accounts);
          
            const balance = await this.web3.eth.getBalance(accounts[0]);
            console.log("balance", this.web3.utils.fromWei(balance, "ether"));

            this.owner = accounts[0];

            this.accounts = accounts;
            // console.log(this.accounts);

            this.airlines.push(accounts[1]);
            this.airlines.push(accounts[2]);

            this.passengers.push(accounts[3]);
            this.passengers.push(accounts[4]);

            console.log("assigned airlines and passengers");

            console.log("this.flightSuretyApp", this.flightSuretyApp);
            console.log("this.flightSuretyData", this.flightSuretyData);

            callback();
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

    authorizeAddress(addressToAuthorize, callback) {
        var self = this;
        console.log(`
            authorize with input 
            address: ${addressToAuthorize}`);

            var payload = {
            addressToAuthorize : addressToAuthorize
        }

        this.flightSuretyData.methods
        .authorizeCaller(payload.addressToAuthorize)
        .send(
            {
                from:self.owner
            }, (error, result) => {
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

        this.flightSuretyApp.methods
            .registerAirline(payload.airline)
            .send(
                {from:this.owner}, (error, result) => {
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
            .registerFlight(payload.airline, payload.flight)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    fund( airlineAdress, funds, callback) {
        console.log(`airline fund with input 
            airline: ${airlineAdress} and funds :${funds}`);
        var self = this;
        var payload = {
            airline : airlineAdress,
            whoFund : airlineAdress,
            value : this.web3.utils.toWei(funds.toString(), "ether")
        } 

        console.log("payload.whoFund : ", payload.whoFund)
        this.flightSuretyApp.methods
            .fund(payload.airline)
            .send({ 
                from: payload.whoFund,
                value: payload.value,
                gas: 30000
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
            .send({ from: self.owner}, (error, result) => {
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
            .buy(payload._addressAirline,
                 payload.flight,
                  payload.passengerAddress
                  )
            .send(
            { 
                from: payload.passengerAddress, 
                value: priceInWei,
                gas: 500000,
                gasPrice: 1
            }, (error, result) => {
                callback(error, payload);
            });
    }
}