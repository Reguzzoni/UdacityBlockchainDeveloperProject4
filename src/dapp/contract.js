import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.timestampTest;
    }

    initialize(callback) {
        if (window.ethereum) {
            try {
                this.web3 = new Web3(window.ethereum);
                // Request account access
                window.ethereum.enable();
            } catch (error) {
                // User denied account access...
                console.error("User denied account access")
            }
        }
        if (typeof this.web3 == "undefined") {
            this.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));
            console.log("local ganache provider");
        }
        

        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            this.accounts = accts;
            // console.log(this.accounts);

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            this.flightSuretyData.methods.authorizeCaller(this.appAddress).send({from: this.owner}, (error, result) => {
                if(error) {
                    console.log("Could not authorize the App contract");
                    console.log(error);
                }
            });

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(airline, flight, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    registerFlight(airlineAddress, flight, callback) {
        console.register(`
            register flight with input 
            airline: ${airline}
            flight: ${flight}`);

        let timestampTmp = Math.floor(Date.now() / 1000);
        let self = this;
        let payload = {
            airline : airlineAddress,
            flight: flight,
            timestamp: timestampTmp
        } 

        self.timestamp = timestampTmp;
        self.flightSuretyApp.methods
            .registerFlight(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    fund( airlineAdress, funds, callback) {
        console.register(`airline flight with input 
            airline: ${airline}`);
        let self = this;
        let payload = {
            airline : airlineAdress,
            whoFund : 0X00,
            value : this.web3.utils.toWei(funds.toString(), "ether")
        } 
        
        this.web3.eth.getAccounts((error, accounts) => {
            payload.whoFund = accounts[0];
        });

        self.flightSuretyApp.methods
            .fund(payload.airline)
            .send({ 
                from: payload.whoFund,
                value: payload.value
            })
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    registerPassenger( airline, flight, passenger, passengerName, 
        passengerSurname, passengerAge, callback) {
        console.register(`register flight with input 
            airline: ${airline}
            flight: ${flight},
            passengerName: ${passengerName},
            passengerSurname: ${passengerSurname},
            passengerAge: ${passengerAge}`);

        let self = this;
        let payload = {
            airline : airline,
            flight: flight,
            passengerAddress :passenger,
            passengerName : passengerName,
            passengerSurname : passengerSurname,
            passengerAge : passengerAge,
            timestamp: self.timestamp
        } 

        self.flightSuretyApp.methods
            .registerPassenger(
                payload.airline,
                 payload.flight,
                 payload.passengerAddress,
                 payload.passengerName,
                 payload.passengerSurname,
                 payload.passengerAge,
                 payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                a(error, payload);
            });
    }

    buy(airline, flight, passenger, amount, callback) {
        let self = this;
        let priceInWei = this.web3.utils.toWei(amount.toString(), "ether");
        let payload = {
            airline: airline,
            flight: flight,
            price: amount,
            passengerAddress: passenger,
            timestamp: self.timestamp
        } 

        self.flightSuretyData.methods
            .buy(payload._addressAirline, payload.flight, payload.passengerAddress, payload.timestamp)
            .send({ from: payload.passengerAddress, value: priceInWei,
                gas: 500000,
                gasPrice: 1
            }, (error, result) => {
                callback(error, payload);
            });
    }
}