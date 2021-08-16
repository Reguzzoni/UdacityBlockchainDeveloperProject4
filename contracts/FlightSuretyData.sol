pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./oraclize.sol";

// REQUIREMENT 1
// FlightSuretyData : contracts used for data persistence
contract FlightSuretyData is usingOraclize {
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
     // removed new status cause complex to manage with oracles
    //uint8 private constant STATUS_ACCEPT_PASSENGERS = 5;
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint constant M = 1;
    address[] multiCalls = new address[](0);

    uint private constant LIMIT_PASSENGER = 100;

    //create airline
    struct Airline {
        uint numberAirline;
        address addressAirline;
        bool isFunded;
    }

    uint countAirline = 0;
    mapping(address => Airline) mapAirline;
    mapping(uint => address) mapCountToAddressAirline;

    

    /* as showed with default method getFlightKey,
    *   It return a key identifier of bytes32 and flight got string name flight
    */
    uint countFlight = 0;
    struct Flight {
        address addressAirline;
        string flight;
        mapping(address => Passenger) mapPassenger;
        mapping(uint => address) mapNumberPassengerToAddress;
        uint countPassengers;
        uint numberFlight;
        uint8 status;
        uint256 timestamp;
    }
    
    // registration : when flights get registered and approved
    // bytes is abi.encode of airline + flight
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
        FlightInsurance insurance;
        uint numberPassenger;
    }

    // AUTHORIZED CONTRACTS - who can register airline, flight or passenger
    mapping(address => uint256) private mapAuthorized;


    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    // airlines
    event RegisterAirlineEvent(address _airlineAddress);

    event FundedEvent(address _addressAirline);

    // flight
    event RegisterFlightEvent(address _airlineAddress, string _flight);

    event UpdateFlightEvent(address _airlineAddress, string _flight, uint _status, uint _timestamp);

    event StatusChangedEvent(uint8 _status);

    // passengers
    event RegisterPassengerEvent(address _airlineAddress,string _flight, address _passenger);

    event BoughtInsuranceEvent(address _airlineAddress, string _flight, address _passenger);

    event PayedInsuranceEvent(address _airlineAddress, string _flight, address _passenger);

    event AccountWithdrawnEvent(address _passenger);


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
        _registerAirline(_addressAirline);
        // first airline already funded at start
        mapAirline[_addressAirline].isFunded = true;
        //authorize airline
        mapAuthorized[_addressAirline] = 1;
    }

    function getContractOwner()
    public
    view
    returns (string) {
        return addressToString(contractOwner);
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

    modifier requireAuthorized(address _msgSender) {
        require(mapAuthorized[_msgSender] == 1, "Caller is not authorized");
        _;
    }

    // removed but could be a good idea to have timer on registering and dont allow double entry
    /*

    // RATE LIMITING
    uint256 private enabled = block.timestamp;

    // RE-ENTRANCY GUARD
    uint256 private counter = 1;

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
    */

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
        require(mode != operational, "Mode is different from operational");

        bool isDuplicate = false;

        for(uint i = 0; i < multiCalls.length; i++) {
            if (multiCalls[i] == msg.sender) {
                isDuplicate = true;
                break;
            }
        }

        require(!isDuplicate, "Already Present.");

        multiCalls.push(msg.sender);

        if (multiCalls.length >= M) {
            operational = mode;
            multiCalls = new address[](0);
        }
    }

    // manage authorization
    function authorizeCaller(address _addressToAuth) 
        external 
    requireContractOwner 
    {
        mapAuthorized[_addressToAuth] = 1;
    }

    function isAuthorizedCaller(address _addressToAuth) 
        external 
        view
    requireContractOwner 
    returns (bool)
    {
        return mapAuthorized[_addressToAuth] == 1;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    //-----------------------------------------------------// 
    // ------------------ PASSENGER ------------------------- // 
    //-----------------------------------------------------// 

    function registerPassenger (
        address _addressAirline,
        string _flight,
        address _addressPassenger,
        string _name,
        string _surname
    )
        requireIsOperational 
        requireAuthorized(_addressAirline)
    external {
        
        require( mapAirline[_addressAirline].isFunded, "Airline is not already funded");
        require( mapAirline[_addressAirline].numberAirline > 0, "Airline is not already registered");    
        bytes32 _flightKey = getFlightKeyOfMap(_addressAirline, _flight);
        require(mapFlight[_flightKey].numberFlight > 0, 
            "Flight doesn't exists");

        /*require(mapFlight[_flightKey].status == STATUS_ACCEPT_PASSENGERS, 
            "Flight status doesn't accept anymore passengers");*/

        require(mapFlight[_flightKey].mapPassenger[_addressPassenger].numberPassenger == 0,
            'Already registered Passenger');

        require(mapFlight[_flightKey].countPassengers < LIMIT_PASSENGER,
            'All busy');

        uint _countPassengers = mapFlight[_flightKey].countPassengers;
        _countPassengers = _countPassengers.add(1);
        /*
        FlightInsurance memory _insurance;

        Passenger memory _passenger = Passenger({
            passengerAddress : _addressPassenger,
            name : _name,
            surname: _surname,
            insurance : _insurance,
            numberPassenger : countPassengers
        });
        
        mapFlight[_flightKey].mapPassenger[_addressPassenger] = _passenger;
        */
        mapFlight[_flightKey].mapPassenger[_addressPassenger].passengerAddress = _addressPassenger;
        mapFlight[_flightKey].mapPassenger[_addressPassenger].name = _name;
        mapFlight[_flightKey].mapPassenger[_addressPassenger].surname = _surname;
        mapFlight[_flightKey].mapPassenger[_addressPassenger].numberPassenger = _countPassengers;

        mapFlight[_flightKey].mapNumberPassengerToAddress[_countPassengers] = _addressPassenger;
        mapFlight[_flightKey].countPassengers = _countPassengers;

        emit RegisterPassengerEvent(_addressAirline, _flight, _addressPassenger);
    }

    function isPassenger(
        address _addressAirline,
        string _flight,
        address _addressPassenger
    ) 
    external 
    view 
    returns(bool) {
        bytes32 _flightKey = getFlightKeyOfMap(_addressAirline, _flight);
        return mapFlight[_flightKey].mapPassenger[_addressPassenger].numberPassenger > 0;
    }

    
    function getPassengerCountByFlight(
        address _addressAirline,
        string _flight
    )
    external 
    view 
    returns(uint) {
        bytes32 _flightKey = getFlightKeyOfMap(_addressAirline, _flight);
        return mapFlight[_flightKey].countPassengers;
    }

    //-----------------------------------------------------// 
    // ------------------ FLIGHT ------------------------- // 
    //-----------------------------------------------------// 
    
    function registerFlight(
        address _addressAirline,
        string _flight
    ) external
        requireIsOperational 
        requireAuthorized(_addressAirline)
    {
        bytes32 _flightKey = getFlightKeyOfMap(_addressAirline, _flight);
        require(! (mapFlight[_flightKey].numberFlight > 0), "Flight has already been registered");
        require( mapAirline[_addressAirline].isFunded, "Airline is not already funded");

        countFlight = countFlight.add(1);
        mapFlight[_flightKey].addressAirline = _addressAirline;
        mapFlight[_flightKey].flight = _flight;
        mapFlight[_flightKey].numberFlight = countFlight;
        mapFlight[_flightKey].countPassengers = 0;

        emit RegisterFlightEvent(_addressAirline, _flight);
    }


    // check if is flight registered
    function isFlight(
        address _addressAirline,
        string _flight
    ) 
    external 
    view 
    returns(bool) {
        bytes32 _flightKey = getFlightKeyOfMap(_addressAirline, _flight);
        return mapFlight[_flightKey].numberFlight > 0;
    }

    
    function getFlightCount()
    external 
    view 
    returns(uint) {
        return countFlight;
    }

    //-----------------------------------------------------// 
    // ------------------ AIRLINE ------------------------ // 
    //-----------------------------------------------------// 

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline ( 
        address _addressAirline,
        address _msgSender
    )
        requireIsOperational
        requireAuthorized(_msgSender)
    external
    {   
        require(getAirlineNumberByAddress(_addressAirline) == 0, 
            "Airline is already registered");
        require(mapAirline[_addressAirline].isFunded, 
            "Airline is not funded");

        _registerAirline(_addressAirline);
        emit RegisterAirlineEvent(_addressAirline);
    }

    function _registerAirline ( 
        address _addressAirline
    )
    internal
    {
        countAirline = countAirline.add(1);
        mapAirline[_addressAirline].numberAirline = countAirline;
        mapAirline[_addressAirline].addressAirline = _addressAirline;
        mapCountToAddressAirline[countAirline] = _addressAirline;
    }

    function getAirlinesCount()
    external
    view
    requireIsOperational
    returns (uint){
        return countAirline;
    }

    function isAirline(address _addressAirline)
    external
    view 
    returns (bool result) {
        for (uint idxAirlines = 1 ;
            idxAirlines <= countAirline; 
            idxAirlines++) {
                if(_addressAirline == mapCountToAddressAirline[idxAirlines]) {
                    return true;
                }
        }
        return false;
    }

    function getAirlineNumberByAddress(address _addressAirline)
    public
    view 
    returns (uint _numberAirline) {
        for (uint idxAirlines = 1 ;
            idxAirlines <= countAirline; 
            idxAirlines++) {
                if(_addressAirline == mapCountToAddressAirline[idxAirlines]) {
                    return idxAirlines;
                }
        }
        return 0;
    }

    function getAirlineAddressByNumber(uint _numberAirline)
    public
    view 
    returns (address _addressAirline) {
        for (uint idxAirlines = 1 ;
            idxAirlines <= countAirline; 
            idxAirlines++) {
                if(idxAirlines == _numberAirline) {
                    return mapCountToAddressAirline[idxAirlines];
                }
        }
    }

    function isFund(address _addressAirline)
    public
    view 
    returns (bool) {
        return mapAirline[_addressAirline].isFunded;
    }


    // has required form suretyApp, need a method to processFlightStatus
    function processFlightStatus(
        address _addressAirline, 
        string _flight,
        uint8 _status,
        uint _timestamp,
        address _oracleAddress) 
    requireIsOperational
    requireAuthorized(_oracleAddress)
    external 
    {
        bytes32 _flightKey = getFlightKeyOfMap(_addressAirline, _flight);
        require(mapFlight[_flightKey].numberFlight > 0, "Flight is not registered");

        mapFlight[_flightKey].status = _status;
        mapFlight[_flightKey].timestamp = _timestamp;

        if(_status == STATUS_CODE_LATE_AIRLINE) {
            for (uint idxPassenger = 1 ;
                idxPassenger <= mapFlight[_flightKey].countPassengers; 
                idxPassenger++) {
                address _addressPassenger = mapFlight[_flightKey].mapNumberPassengerToAddress[idxPassenger];

                if(_addressPassenger != address(0)) {                   
                    creditInsurees(
                        _addressAirline,
                        _flight,
                        _addressPassenger);
                }
            }
        }


        emit StatusChangedEvent(_status);
    }

    function fund( address _addressAirline)
    external
    payable 
    requireIsOperational 
    {
        mapAirline[_addressAirline].isFunded = true;
        emit FundedEvent(_addressAirline);
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
        address msgSender
    )
        external
        payable
        requireIsOperational
        requireAuthorized(msgSender)
        returns (uint)
    {       
        bytes32 _flightKey = getFlightKeyOfMap(_addressAirline, _flight);
        require(msgSender == tx.origin, "Contracts not allowed");
        require(mapFlight[_flightKey].numberFlight > 0, "Flight is not registered");
        require(mapFlight[_flightKey].mapPassenger[_passengerAddress].numberPassenger > 0,
            "Its not a passenger of this flight");

        countInsurance = countInsurance.add(1);
        mapFlight[_flightKey].mapPassenger[_passengerAddress].insurance.numberInsurance = countInsurance;
        mapFlight[_flightKey].mapPassenger[_passengerAddress].insurance.isPayed = false;
        
        Payment memory _payment = Payment({
            amountToPay : _amount,
            multiplier : _multiplier
        });

        mapFlight[_flightKey].mapPassenger[_passengerAddress].insurance.payment = _payment;

        emit BoughtInsuranceEvent(_addressAirline, _flight, _passengerAddress);

        return countInsurance;
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees (
        address _addressAirline,
        string _flight,
        address _passengerAddress
    ) public
        requireIsOperational
    {
        
        bytes32 _flightKey = getFlightKeyOfMap(_addressAirline, _flight);
        require(mapFlight[_flightKey].numberFlight > 0, "Flight is not registered");
        require(mapFlight[_flightKey].mapPassenger[_passengerAddress].numberPassenger > 0, 
            "Passenger is not registered");

        /*require(!(mapFlight[_flightKey].mapPassenger[_passengerAddress].insurance.isPayed),
            "Insurance is already payed!");*/

        mapFlight[_flightKey].mapPassenger[_passengerAddress].insurance.isPayed = true;

        uint _amountToPay = 
            mapFlight[_flightKey].mapPassenger[_passengerAddress].insurance.payment.amountToPay
            .mul(mapFlight[_flightKey].mapPassenger[_passengerAddress].insurance.payment.multiplier)
            .div(100);
        
        mapPaymentsToDo[_passengerAddress] = _amountToPay;

        emit PayedInsuranceEvent(_addressAirline, _flight, _passengerAddress);
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
        requireAuthorized(_passengerAddress)
    {
        uint _amountToPay = mapPaymentsToDo[_passengerAddress];
        mapPaymentsToDo[_passengerAddress] = 0;

        _passengerAddress.transfer(_amountToPay);

        emit AccountWithdrawnEvent(_passengerAddress);
    }

    function hasInsurance(
        address _addressAirline,
        string  _flight,
        address _addressPassenger
    )
        external
        view
        requireIsOperational
    returns (bool)
    {
        bytes32 _flightKey = getFlightKeyOfMap(_addressAirline, _flight);
        return mapFlight[_flightKey].mapPassenger[_addressPassenger].insurance.numberInsurance != 0;
    }

    function getInsurance(
        address _addressAirline,
        string  _flight,
        address _addressPassenger
    )
        external
        view
        requireIsOperational
    returns (uint)
    {
        bytes32 _flightKey = getFlightKeyOfMap(_addressAirline, _flight);
        return mapFlight[_flightKey].mapPassenger[_addressPassenger].insurance.numberInsurance;
    }

    function isPayed(
        address _addressAirline,
        string  _flight,
        address _addressPassenger
    )
        external
        view
        requireIsOperational
    returns (bool)
    {
        bytes32 _flightKey = getFlightKeyOfMap(_addressAirline, _flight);
        return mapFlight[_flightKey].mapPassenger[_addressPassenger].insurance.isPayed;
    }

    function getCountInsurance()
        external
        view
        requireIsOperational
    returns (uint)
    {
        return countInsurance;
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

    function getFlightKeyOfMap
                        (
                            address airline,
                            string memory flight
                        )
                        internal
                        pure
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight));
    }

    function getFlightStatus
                        (
                            address _addressAirline,
                            string _flight
                        )
                        external
                        view
                        returns(uint8) 
    {
        bytes32 _flightKey = getFlightKeyOfMap(_addressAirline, _flight);
        return mapFlight[_flightKey].status;
    }

    // conversion function tiped by stackoverflow
    function addressToString(address _address)  
    pure 
    internal
    returns (string memory _uintAsString) {
        bytes32 value = bytes32(uint256(_address));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(51);
        str[0] = "0";
        str[1] = "x";
        for (uint i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint(uint8(value[i + 12] >> 4))];
            str[3+i*2] = alphabet[uint(uint8(value[i + 12] & 0x0f))];
        }
        return string(str);
    }


    // conversion function tiped by stackoverflow
    function uintToString(uint v) 
    pure 
    internal
    returns (string str) {
        uint maxlength = 100;
        bytes memory reversed = new bytes(maxlength);
        uint i = 0;
        while (v != 0) {
            uint remainder = v % 10;
            v = v / 10;
            reversed[i++] = byte(48 + remainder);
        }
        bytes memory s = new bytes(i + 1);
        for (uint j = 0; j <= i; j++) {
            s[j] = reversed[i - j];
        }
        str = string(s);
    }

    function getPassengerInfo
                        (
                            address _addressAirline,
                            string _flight,
                            uint idx
                        )
                        public
                        view
                        returns(string) 
    {
        bytes32 _flightKey = getFlightKeyOfMap(_addressAirline, _flight);
        address _addressPassenger = mapFlight[_flightKey].mapNumberPassengerToAddress[idx];
        mapFlight[_flightKey].mapPassenger[_addressPassenger].passengerAddress;
        mapFlight[_flightKey].mapPassenger[_addressPassenger].name;
        mapFlight[_flightKey].mapPassenger[_addressPassenger].surname;
        mapFlight[_flightKey].mapPassenger[_addressPassenger].numberPassenger;
        
        string memory addressPassengerString = strConcat("addressPassengerString :", 
            addressToString(mapFlight[_flightKey].mapPassenger[_addressPassenger].passengerAddress));
        string memory nameString = strConcat("name :", 
            mapFlight[_flightKey].mapPassenger[_addressPassenger].name);
        string memory surnameString = strConcat("surname :", 
            mapFlight[_flightKey].mapPassenger[_addressPassenger].surname);
        string memory numberString = strConcat("numberPassenger :", 
            uintToString(mapFlight[_flightKey].mapPassenger[_addressPassenger].numberPassenger));
        
        string memory part1 = strConcat(addressPassengerString, nameString, surnameString, numberString);
        
        return part1;
    } 

    function getFlightInfo
                        (
                            address _addressAirline,
                            string _flight
                        )
                        public
                        view
                        returns(string) 
    {
        bytes32 _flightKey = getFlightKeyOfMap(_addressAirline, _flight);
        string memory addressString = strConcat("airline :", addressToString(mapFlight[_flightKey].addressAirline));
        string memory flightString = strConcat("flight :", mapFlight[_flightKey].flight);
        string memory timestampString = strConcat("timestamp :", uintToString(mapFlight[_flightKey].timestamp));
        string memory countPassString = strConcat("countPassengers :", uintToString(mapFlight[_flightKey].countPassengers));
        string memory numberString = strConcat("numberFlight :", uintToString(mapFlight[_flightKey].numberFlight));
        string memory statusString = strConcat("status :", uintToString(mapFlight[_flightKey].status));
        
        string memory part1 = strConcat(addressString, flightString, timestampString);
        string memory part2 = strConcat(countPassString, numberString, statusString);
        return strConcat(part1, part2);
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

