import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.timestampTest;
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accounts) => {
           
            this.owner = accounts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accounts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accounts[counter++]);
            }
            
            flightSuretyData.methods.authorizeCaller(
                this.appAddress
            ).send({
                from: this.owner
            }, (error, result) => {
                if(error) {
                    console.log(`Error caused by ${error}`);
                } else {
                    console.log("Authorized with success");
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

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    registerFlight(flight, callback) {
        console.register(`
            register flight with input 
            airline: ${airline}
            flight: ${flight}`);

        let timestampTmp = Math.floor(Date.now() / 1000);
        let self = this;
        let payload = {
            airline : this.airlines[0],
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

    fund( funds, callback) {
        console.register(`airline flight with input 
            airline: ${airline}`);
        let self = this;
        let payload = {
            airline : self.airlines[0],
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

    registerPassenger( flight, passengerName, 
        passengerSurname, passengerAge, callback) {
        console.register(`register flight with input 
            airline: ${self.airlines[0]}
            flight: ${flight},
            passengerName: ${passengerName},
            passengerSurname: ${passengerSurname},
            passengerAge: ${passengerAge}`);

        let self = this;
        let payload = {
            airline : self.airlines[0],
            flight: flight,
            passengerAddress : 0X00,
            passengerName : passengerName,
            passengerSurname : passengerSurname,
            passengerAge : passengerAge,
            timestamp: self.timestamp
        } 

        this.web3.eth.getAccounts((error, accounts) => {
            payload.passengerAddress = accounts[1];
        });

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
                callback(error, payload);
            });
    }

    buy(flight, amount, callback) {
        let self = this;
        let priceInWei = this.web3.utils.toWei(amount.toString(), "ether");
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            price: priceInWei,
            passengerAddress: 0x00,
            timestamp: self.timestamp
        } 

        this.web3.eth.getAccounts((error, accounts) => {
            payload.passengerAddress = accounts[1];
        });

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