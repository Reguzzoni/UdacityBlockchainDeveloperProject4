
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
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        DOM.elid('registerFlight').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            
            // Write transaction
            contract.registerFlight(flight, (error, result) => {
                display('Fligth Registered', 'Success', [ { label: 'Success', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })
        
        DOM.elid('Fund').addEventListener('click', () => {
            let fund = DOM.elid('funds').value;
            // Write transaction
            contract.registerPassenger(
                fund, (error, result) => {
                display(' registerPassenger ', 'Passenger Registered', [ { label: 'Success', error: error, value: result.flight + ' ' + result.passengerName} ]);
            });
        })

        DOM.elid('registerPassenger').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            let name = DOM.elid('name').value;
            let surname = DOM.elid('surname').value;
            let age = DOM.elid('age').value;
            
            // Write transaction
            contract.registerPassenger(
                flight, name, surname, age, (error, result) => {
                display(' registerPassenger ', 'Passenger Registered', [ { label: 'Success', error: error, value: result.flight + ' ' + result.passengerName} ]);
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







