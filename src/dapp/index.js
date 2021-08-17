
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    
        // User-submitted transaction
        DOM.elid('Authorize_authorizeAddress').addEventListener('click', () => {
            let addressToAuthorize = DOM.elid('Authorize_address').value;
            // Write transaction
            console.log(`Started authorize with address ${addressToAuthorize}`);
            contract.authorizeAddress(addressToAuthorize, (error, result) => {
                display('authorizeCaller', 'Authorize_address', [ { label: 'Authorize_address', error: error, value: result.addressToAuthorize} ]);
            });
        })

        DOM.elid('IsAuthorized_authorizeAddress').addEventListener('click', () => {
            let addressToCheckAuthorize = DOM.elid('IsAuthorized_address').value;
            // Write transaction
            console.log(`Started authorize with address ${addressToCheckAuthorize}`);
            contract.isAuthorizeAddress(addressToCheckAuthorize, (error, result) => {
                display('IsAuthorizedCaller', 'IsAuthorized_address', [ { label: 'IsAuthorized_address', error: error, value:result.result } ]);
            });
        })

        // User-submitted transaction
        DOM.elid('Airline_registerAirline').addEventListener('click', () => {
            let airlineAddress = DOM.elid('Airline_airlineAddress').value;
            // Write transaction
            console.log(`Started register airline with address ${airlineAddress}`);
            contract.registerAirline(airlineAddress, (error, result) => {
                display('Airline', 'Register airline', [ { label: 'Register airline', error: error, value: "airline address registered :" + result.airline} ]);
            });
        })

        DOM.elid('Airline_fund').addEventListener('click', () => {
            let airlineAddress = DOM.elid('Fund_airlineAddress').value;
            let fund = DOM.elid('Fund_fund').value;
            // Write transaction
            contract.fund(airlineAddress,fund, (error, result) => {
                display('Airline', 'Fund', [ { label: 'Fund airline', error: error, 
                value: "airline address fund :" + result.airline +  " with result " + result.value} ]);
            });
        })
        
        DOM.elid('Fetch_flightStatus').addEventListener('click', () => {
            let airline = DOM.elid('Fetch_airlineAddress').value;
            let flight = DOM.elid('Fetch_flightCode').value;
            // Write transaction
            contract.fetchFlightStatus(airline, flight, (error, result) => {
                display('Fetch ', 'Fetch ', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        DOM.elid('Flight_registerFlight').addEventListener('click', () => {
            let airline = DOM.elid('Flight_airlineAddress').value;
            let flight = DOM.elid('Flight_flightCode').value;
            
            // Write transaction
            contract.registerFlight(airline, flight, (error, result) => {
                display('Fligth Registered', 'Success', [ { label: 'Success', error: error, value: "Registered flight : " + result.flight } ]);
            });
        })

        DOM.elid('Passenger_registerPassenger').addEventListener('click', () => {
            let airline = DOM.elid('Passenger_airlineAddress').value;
            let flight = DOM.elid('Passenger_flightCode').value;
            let passenger = DOM.elid('Passenger_passengerAddress').value;
            let name = DOM.elid('Passenger_passengerName').value;
            let surname = DOM.elid('Passenger_passengerSurname').value;
            
            // Write transaction
            contract.registerPassenger(
                airline, flight, passenger, name, surname, (error, result) => {
                display(' registerPassenger ', 'Passenger Registered', [ { label: 'Success', error: error, 
                value: "Registered passenger on flight : " + result.flight + ' with name ' + result.passengerName} ]);
            });
        })

        DOM.elid('Buy_insurance').addEventListener('click', () => {
            let airline = DOM.elid('Buy_airlineAddress').value;
            let flight = DOM.elid('Buy_flightCode').value;
            let passenger = DOM.elid('Buy_passengerAddress').value;
            let values = DOM.elid('Buy_value').value;
            // Write transaction
            contract.buy(
                airline, flight, passenger, values, (error, result) => {
                display(' buy ', 'buy insurance', [ { label: 'Success', error: error, 
                value: "Passenger buy insurance for flight :" + result.flight + ' and passenger address is ' + result.passengerAddress} ]);
            });
        })


        DOM.elid('Pay_insurance').addEventListener('click', () => {
            let passenger = DOM.elid('Pay_passengerAddress').value;

            // Write transaction
            contract.pay(passenger, (error, result) => {
                display(' pay ', 'pay insurance', [ { label: 'Success', error: error, 
                value: "Passenger pay insurance" + result.passengerAddress} ]);
            });
        })
        
    
    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







