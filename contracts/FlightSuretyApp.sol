pragma solidity ^0.4.25;


// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

// app logic and oracles code
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./oraclize.sol";
//import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp is usingOraclize {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    // created status STATUS_ACCEPT_PASSENGERS when passenger can be registered to flight
    // removed cause much complex to manage with oracles
    // uint8 private constant STATUS_ACCEPT_PASSENGERS = 5;

    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner;          // Account used to deploy contract

    // import FlightSuretyData as showed with ExerciseC6C
    FlightSuretyData flightSuretyData;

    // ether var
    // each arline has to submit 10 ether
    uint constant AIRLINE_FUND_VALUE = 10 ether;
    // Passenger may pay upto 1 ether for purchaising flight insurance
    uint constant INSURANCE_VALUE_MAX = 1 ether;
    // if flight is delayed due to airline fault, passenger
    // receives of 1.5X the amount they paid
    uint constant INSURANCE_MULT = 150; 

    // manage multi calls consensus
    uint constant M = 4;
    uint constant CONSENSUS_50 = M/2;
    mapping(address => address[]) private multiCalls;

 
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
         // Modify to call data contract's status
        require(isOperational(), "Contract is currently not operational");  
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
    /********************************************************************************************/
    /*                                       EVENTS                                        */
    /********************************************************************************************/

    event RegisterAirlineEvent(address _airlineAddress);

    event RegisterFligthEvent(address _flightAddress);

    event RegisterPassengerEvent(address _passengerAddress);

    event BoughtInsuranceEvent(uint _numberinsurance);

    event ProcessedFlightEvent(uint8 _status);

    event FundedEvent(address _addressAirline);

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
                                (
                                    address dataContract
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        //exerciseC6C = ExerciseC6C(dataContract);
        flightSuretyData = FlightSuretyData(dataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() 
                            public 
                            returns(bool) 
    {
        return flightSuretyData.isOperational();  // Modify to call data contract's status
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

  

   /**
    * @dev Add an airline to the registration queue
    *
    */   
    // Only existing airline may register a new airline 
    // until there are at least four airlines registered

    // Registration of fityh and subsequent airlines requires multi-party
    // consensus of 50% of registered airlines

    // Airline can be registered but does not partecipate in contract until it submits
    // funding of 10 ether
    function registerAirline (   
        address _addressAirline)
        external
        requireIsOperational 
        returns(bool success, uint256 votes)
    {   
        success = false;
         
        bool isAirline = flightSuretyData.isAirline(msg.sender);
        bool isFunded = flightSuretyData.isFund(msg.sender);

        require(isAirline, strConcat("Airline must exist to register a new airline ", addressToString(msg.sender)));
        require(isFunded, strConcat("Airline must be funded to register a new airline ", addressToString(msg.sender)));

        uint countAirlines = flightSuretyData.getAirlinesCount();
        if(countAirlines < M) {
            flightSuretyData.registerAirline(_addressAirline, msg.sender);
            emit RegisterAirlineEvent(_addressAirline);

        } else {
            //multi calls logic
            bool isDuplicate = false;
            address owner = msg.sender;

            for(uint idx = 0; idx < multiCalls[owner].length; idx++) {
                if (multiCalls[owner][idx] == msg.sender) {
                    isDuplicate = true;
                    break;
                }
            }

            require(!isDuplicate, "Already Present.");
            multiCalls[owner].push(msg.sender);

            // CALCULATE 50% PARTECIPANT ALL
            uint consensusLimit = countAirlines.div(CONSENSUS_50);
            if (multiCalls[owner].length >= consensusLimit) {
                success = true;
                flightSuretyData.registerAirline(_addressAirline, msg.sender);
                emit RegisterAirlineEvent(_addressAirline);
                multiCalls[owner] = new address[](0);
            }
        }

        votes = multiCalls[owner].length;

        return (success, votes);
    }


   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight(
        address _addressAirline,
        string _flight,
        address _msgSender
    )
        requireIsOperational 
        external                        
    {
        flightSuretyData.registerFlight(_addressAirline, _flight, _msgSender);
        emit RegisterFligthEvent(_addressAirline);
    }

    function registerPassenger(
        address _addressAirline,
        string _flight,
        address _addressPassenger,
        string _name,
        string _surname
    )
        requireIsOperational 
        external                        
    {
        flightSuretyData.registerPassenger(
            _addressAirline, _flight, _addressPassenger,
            _name, _surname);
        emit RegisterPassengerEvent(_addressAirline);
    }
    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function _processFlightStatus
    (
        address _airline,
        string _flight,
        uint256 _timestamp,
        uint8 _statusCode,
        address oracleAddress
    )
        internal
        requireIsOperational
    {
        flightSuretyData.processFlightStatus(
                _airline, 
                _flight, 
                _timestamp, 
                _statusCode, 
                oracleAddress);
        emit ProcessedFlightEvent(_statusCode);
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
    (
        address airline,
        string flight,
        uint256 timestamp                            
    )
        external
        requireIsOperational
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    } 

    function isOpenOracleResponse(
        uint8 _index, 
        address _airline, 
        string _flight, 
        uint _timestamp) 
    external
    view 
    returns (bool) {
        bytes32 key = keccak256(abi.encodePacked(_index, _airline, _flight, _timestamp));
        return oracleResponses[key].isOpen;
    }

    function isOracleAddress(address _addressOracle)
    external
    view
    returns (bool) {
        return oracles[_addressOracle].isRegistered;
    }

    function convertToPayableAddress(address _addressNotPayable)
    internal
    pure
    returns (address) {
        address _addressPayable = address(uint160(_addressNotPayable));
        return _addressPayable;
    }

    function fund(
        address _addressAirline) 
    payable 
    external
    requireIsOperational {
        require(msg.value == AIRLINE_FUND_VALUE, 
            "Need 10 ether to reach the fund value needed");
        
        /* ERROR CAUSE NOT PAYABLE ADDRESS
        flightSuretyData.transfer(msg.value);
        flightSuretyData.fund(msg.sender);
        */
        address flightSuretyDataPayable = convertToPayableAddress(flightSuretyData);
        flightSuretyDataPayable.transfer(msg.value);
        
        flightSuretyData.fund(msg.sender);

        emit FundedEvent(_addressAirline);
    }

    function buy(
        address _addressAirline,
        string _flight,
        address _passengerAddress) 
    external 
    payable 
    requireIsOperational {
        require(msg.value <= INSURANCE_VALUE_MAX, "Insurance value is over limit"); 
        address flightSuretyDataPayable = convertToPayableAddress(flightSuretyData);  
        flightSuretyDataPayable.transfer(msg.value);

        
        uint _numberInsurance = flightSuretyData.buy(
            _addressAirline, _flight, _passengerAddress,
             msg.value, INSURANCE_MULT, msg.sender);
        emit BoughtInsuranceEvent(_numberInsurance);
    }
    
    function pay() 
    public 
    requireIsOperational {
        flightSuretyData.pay(msg.sender);
    }
    
    function isAirline(address _addressAirline) 
    public 
    requireIsOperational 
    returns (bool) {
        return flightSuretyData.isAirline(_addressAirline);
    }

// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    // for test moved to 1 from 3
    uint256 private constant MIN_RESPONSES = 1;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);

    //event TriggerOracleEvent(uint8 index, address airline, string flight, uint256 timestamp, uint8 statusCode);

    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns(uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string flight,
                            uint256 timestamp,
                            uint8 statusCode,
                            address oracleAddress
                        )
                        external
    {
        require(
            (oracles[msg.sender].indexes[0] == index) || 
            (oracles[msg.sender].indexes[1] == index) || 
            (oracles[msg.sender].indexes[2] == index), 
            "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            _processFlightStatus(airline, flight, timestamp, statusCode, oracleAddress);
        }
    }

    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    function getContractOwner
    ()
    external
    view
    returns (string)
    {
        return flightSuretyData.getContractOwner();
    }

    function authorizeCaller(
        address _addressToAuth
    ) 
    external
    {
        flightSuretyData.authorizeCaller(_addressToAuth);
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


    // conversion function tiped by stackoverflow AS PROJECT 5
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

    function getAirlinesCount()
    external
    view
    returns (uint) {
        return flightSuretyData.getAirlinesCount();
    }

    function getAirlineAddressStringByNumber(uint _numberAirline)
    public
    view 
    returns (string _addressAirline) {
        return flightSuretyData.getAirlineAddressStringByNumber(_numberAirline);
    }

    function isAuthorizedCaller(address _addressToAuth) 
        external 
        view
    returns (bool) {
        return flightSuretyData.isAuthorizedCaller(_addressToAuth);
    }
// endregion

} 
 
contract FlightSuretyData {
    

    function isOperational() 
                            public 
                            returns(bool) ;
    function setOperatingStatus( bool mode ) 
        external;

    function registerPassenger (
        address _addressAirline,
        string _flight,
        address _addressPassenger,
        string _name,
        string _surname
    )
    external;

    function registerFlight(
        address _addressAirline,
        string _flight,
        address _msgSender
    ) external;

    function registerAirline ( 
        address _addressAirline,
        address _msgSender
        // optional , bool isAdmin 
    )
    external;
    
     function buy (  
        address _addressAirline,
        string _flight,
        address _passengerAddress,
        uint _amount,
        uint _multiplier,
        address _msgSender
    )
        external
        payable
    returns (uint);

    function creditInsurees (
        address _addressAirline,
        string _flight,
        address _passengerAddress
    ) public;

    function pay (
        address _passengerAddress
    )
    external;

    // need to publish update status
    function processFlightStatus(
        address _addressAirline, 
        string _flight, 
        uint _timestamp, 
        uint _status,
        address _addressOracle)
    external;
    
    function isAirline( address _addressAirline)
    external
    view 
    returns (bool result);

    // request to fund 10 ether to airline
    function fund( address _addressAirline)
    external
    payable;

    // get all airlines count registered
    function getAirlinesCount()
    external
    view
    returns (uint);

    function isFund(address _addressAirline)
    public
    view 
    returns (bool);

    function authorizeCaller(address _addressToAuth) 
    external;

    function getContractOwner()
    external
    view
    returns (string);

    function getAirlineAddressStringByNumber(uint _numberAirline)
    public
    view 
    returns (string _addressAirline);

    function isAuthorizedCaller(address _addressToAuth) 
        external 
        view
    returns (bool);
}