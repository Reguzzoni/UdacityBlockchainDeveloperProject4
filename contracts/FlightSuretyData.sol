pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

// REQUIREMENT 1
// FlightSuretyData : contracts used for data persistence
contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Account used to deploy contract
    address private contractOwner;   

    // Blocks all state changes throughout the contract if false                                   
    bool private operational = true;                                    

    /** REQUIREMENT 2: Airlines
        - To make it simpler, have the first airline automatically deployed
        - Only existing airlines may register a new airlane until there
            are at least 4 airlined registered
            The second, third and fourth register airlnes are registered
            by any of the airlines that had been registered to that point.
        - use multi-party consensus technique to have at least 50% of the currently registered airlines 
            to apporve the registration.

        - registration :  when they get registered and approved
        - 2 insuerance : each arline has to submit 10 ether

        As exercise exerciseC6A create struct
        uint constant M = 2;
        struct UserProfile {
            bool isRegistered;
            bool isAdmin;
        }
        mapping(address => UserProfile) userProfiles                        // Mapping for storing user profiles
     */
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint constant M = 4;
    address[] multiCalls = new address[](0);

    //create airline
    struct Airline {
        uint numberAirline;
        address addressAirline;
    }

    uint countAirline = 0;
    mapping(address => Airline) mapAirline;

    uint countFlight = 0;

    /* as showed with default method getFlightKey,
    *   It return a key identifier of bytes32 and flight got string name flight
    */
    struct Flight {
        string flight;
        address addressAirline;
        uint status;
        // flight numbers and timestamps, for purchasing insurance
        uint timestamp;
        mapping(address => Passenger) mapPassenger;
        mapping(uint => address) mapNumberPassengerToAddress;
        uint countPassengers;
        uint numberFlight;
    }
    // registration : when they get registered and approved
    mapping(bytes32 => Flight) mapFlight;

    // insurance : each arline has to submit 10 ether
    uint countInsurance = 0;
    struct FlightInsurance {
        uint numberInsurance;
        Payment payment;
        bool isPayed;
    }

    /**  REQUIREMENTS 3: PASSENGERS
        - passengers may pay to tone ether for insurance
        - cap for the amount that a passenger may invest
        - flight numbers and timestamps are fixed for the purpose of the project
            and can be defined in the Dapp Client
        - if flight is delayed due to airline fault 
            passenger receives credito fo 1.5X the amount they paid
    */
    struct Payment {
        uint amountToPay;
        uint multiplier;
    }
    mapping(address => uint) mapPaymentsToDo;
    /**
        REQUIREMENTS 4: ORACLES
    */

    /**
        REQUIREMENTS 5: GENERAL
        - operational status control
        - function must fail fast - use require
    */

    struct Passenger {
        /*
        The funds are transferred, if airline delay, 
        the passenger does not actually get the funds in their wallet,
        it accumulates in their account in the smart contract,
        and they have to initiate a withdrawal at which point they will be able
        to get the funds
        */
        address passengerAddress;
        string name;
        string surname;
        uint age;
        FlightInsurance insurance;
        uint numberPassenger;
    }

    // RATE LIMITING
    uint256 private enabled = block.timestamp;

    // RE-ENTRANCY GUARD
    uint256 private counter = 1;

    // AUTHORIZED CONTRACTS - who can register airline, flight or passenger
    mapping(address => uint256) private mapAuthorized;


    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event RegisterAirlineEvent(address _airlineAddress);

    event FundAirlineEvent(address _airlineAddress);

    event RegisterFlightEvent(string _flight);

    event UpdateFlightEvent(string _flight, uint _status);

    event RegisterPassengerEvent(string _flight, address _passenger);

    event BoughtInsuranceEvent(string _flight,address _passenger);

    event PayedInsuranceEvent(address _passenger);

    event AccountWithdrawnEvent(address _passenger);

    event StatusChangedEvent(address _addressAirline, string _flightKey);

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(
        // To make it simpler, have the first airline automatically deployed  
        address _addressAirline
    ) public 
    {
        contractOwner = msg.sender;
        countAirline = countAirline.add(1);
        Airline memory _newAirline = Airline({
            numberAirline : countAirline,
            addressAirline : _addressAirline
            
        });
        mapAirline[_addressAirline] = _newAirline;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAuthorized() {
        require(mapAuthorized[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    modifier rateLimit(uint256 time) {
        require(block.timestamp >= enabled, "Rate limiting in effect");
        enabled = enabled.add(time);
        _;
    }

    modifier entrancyGuard() {
        counter = counter.add(1);
        uint256 guard = counter;
        _;
        require(guard == counter, "That is not allowed");
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus( bool mode ) 
        external
        requireContractOwner 
    {
        require(mode != operational, "Mode is different of operation");

        bool isDuplicate = false;

        for(uint i = 0; i < multiCalls.length; i++) {
            if (multiCalls[i] == msg.sender) {
                isDuplicate = true;
                break;
            }
        }

        require(!isDuplicate, "Already called this function.");

        multiCalls.push(msg.sender);

        if (multiCalls.length >= M) {
            operational = mode;
            multiCalls = new address[](0);
        }
    }

    function authorizeCaller(address _addressToAuth) 
        external 
    requireContractOwner 
    {
        mapAuthorized[_addressToAuth] = 1;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function registerPassenger (
        address airlineAddress,
        string _flight,
        address _passengerAddress,
        string _name,
        string _surname,
        uint _age,
        uint _timestamp
    )
        requireIsOperational 
        requireAuthorized 
    external {
        bytes32 _flightKey = getFlightKey(airlineAddress, _flight, _timestamp);
        require(! (mapFlight[_flightKey].numberFlight > 0), 
            "Flight has already been registered");

        require(mapFlight[_flightKey].mapPassenger[_passengerAddress].numberPassenger > 0,
            'Already registered Passenger');

        uint countPassengers = mapFlight[_flightKey].countPassengers;
        countPassengers = countPassengers.add(1);

        FlightInsurance memory _insurance;

        Passenger memory _passenger = Passenger({
            passengerAddress : _passengerAddress,
            name : _name,
            surname: _surname, 
            age: _age,
            insurance : _insurance,
            numberPassenger : countPassengers
        });

        mapFlight[_flightKey].mapPassenger[_passengerAddress] = _passenger;
        mapFlight[_flightKey].countPassengers = countPassengers;

        emit RegisterPassengerEvent(_flight, _passengerAddress);
    }


    function registerFlight(
        address _addressAirline,
        string _flight,
        uint _timestamp
    ) external
        requireIsOperational 
        requireAuthorized
    {
        bytes32 _flightKey = getFlightKey(_addressAirline, _flight, _timestamp);
        require(! (mapFlight[_flightKey].numberFlight > 0), "Flight has already been registered");

        countFlight = countFlight.add(1);
        mapFlight[_flightKey].addressAirline = _addressAirline;
        mapFlight[_flightKey].status = 0;
        mapFlight[_flightKey].timestamp = _timestamp;
        mapFlight[_flightKey].numberFlight = countFlight;
        mapFlight[_flightKey].countPassengers = 0;

        emit RegisterFlightEvent(_flight);
    }

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline ( 
        address _addressAirline
        // optional , bool isAdmin 
    )
        requireIsOperational
        requireContractOwner
        requireAuthorized 
    external
    {
        require((mapAirline[_addressAirline].numberAirline > 0), "Airline is already registered.");

        countAirline = countAirline.add(1);
        Airline memory _newAirline = Airline({
            numberAirline : countAirline,
            addressAirline : _addressAirline
            
        });
        mapAirline[_addressAirline] = _newAirline;

        emit RegisterAirlineEvent(_addressAirline);
    }

    // has required form suretyApp, need a method to processFlightStatus
    function processFlightStatus(
        address _addressAirline, 
        string _flight, 
        uint _timestamp, 
        uint _status) 
    requireIsOperational 
    requireAuthorized 
    external 
    {
        bytes32 _flightKey = getFlightKey(_addressAirline, _flight, _timestamp);
        require(! (mapFlight[_flightKey].numberFlight > 0), "Flight is not registered");

        mapFlight[_flightKey].status = _status;
        if(_status == STATUS_CODE_LATE_AIRLINE) {
            for (uint idxPassenger = 1 ;
                idxPassenger <= mapFlight[_flightKey].countPassengers; 
                idxPassenger++) {
                address _addressPassenger = mapFlight[_flightKey].mapNumberPassengerToAddress[idxPassenger];
                
                creditInsurees(
                    _addressAirline,
                    _flight,
                    _addressPassenger,
                    _timestamp);
            }
        }
        emit StatusChangedEvent(_addressAirline, _flight);
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy (  
        address _addressAirline,
        string _flight,
        address _passengerAddress,
        uint _amount,
        uint _multiplier,
        uint _timestamp
    )
        external
        payable
        requireIsOperational
        requireAuthorized 
    {       
        bytes32 _flightKey = getFlightKey(_addressAirline, _flight, _timestamp);
        require(! (mapFlight[_flightKey].numberFlight > 0), "Flight is not registered");

        Payment memory _payment = Payment({
            amountToPay : _amount,
            multiplier : _multiplier
        });

        FlightInsurance memory _insurance = FlightInsurance({
            numberInsurance : countInsurance,
            payment : _payment,
            isPayed : false
        });
        countInsurance.add(1);

        mapFlight[_flightKey].mapPassenger[_passengerAddress].insurance = _insurance;

        emit BoughtInsuranceEvent(_flight, _passengerAddress);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees (
        address _addressAirline,
        string _flight,
        address _passengerAddress,
        uint _timestamp
    ) public
        requireIsOperational
        requireAuthorized 
    {
        
        bytes32 _flightKey = getFlightKey(_addressAirline, _flight, _timestamp);
        require(! (mapFlight[_flightKey].numberFlight > 0), "Flight is not registered");
        require(! (mapFlight[_flightKey].mapPassenger[_passengerAddress].numberPassenger > 0), 
            "Passenger is not registered");

        require(! (mapFlight[_flightKey].mapPassenger[_passengerAddress].insurance.isPayed),
            "Insurance is already payed!");

        mapFlight[_flightKey].mapPassenger[_passengerAddress].insurance.isPayed = true;
        uint _amountToPay = 
            mapFlight[_flightKey].mapPassenger[_passengerAddress].insurance.payment.amountToPay
            .mul(mapFlight[_flightKey].mapPassenger[_passengerAddress].insurance.payment.multiplier)
            .div(100);
        
        mapPaymentsToDo[_passengerAddress] = _amountToPay;

        emit PayedInsuranceEvent(_passengerAddress);
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay (
        address _passengerAddress
    )
        external
        requireIsOperational
        requireAuthorized 
    {
        uint _amountToPay = mapPaymentsToDo[_passengerAddress];
        mapPaymentsToDo[_passengerAddress] = 0;

        _passengerAddress.transfer(_amountToPay);

        emit AccountWithdrawnEvent(_passengerAddress);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                            )
                            public
                            payable
    {
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        internal
                        pure
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }
}

