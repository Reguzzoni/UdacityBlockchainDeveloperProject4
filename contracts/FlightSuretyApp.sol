pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
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
    uint constant AIRLINE_SUBMIT_VALUE = 10 ether;
    uint constant INSURANCE_VALUE_MAX = 1 ether;
    uint constant INSURANCE_MULT = 150; 

 
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
        require(flightSuretyData.isOperational(), "Contract is currently not operational");  
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

    event BoughtInsuranceEvent(address _passenger);

    event ProcessedFlightEvent(string _flight);

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
    function registerAirline (   
        address _addressAirline)
        external
        requireIsOperational 
        returns(bool success, uint256 votes)
    {   
        flightSuretyData.registerAirline(_addressAirline);
        emit RegisterAirlineEvent(_addressAirline);

        return (success, 0);
    }


   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight(
        address _addressAirline,
        string _flight,
        uint _timestamp
    )
        requireIsOperational 
        external                        
    {
        flightSuretyData.registerFlight(_addressAirline, _flight, _timestamp);
        emit RegisterFligthEvent(_addressAirline);
    }

    function registerPassenger(
        address _addressAirline,
        string _flight,
        address _addressPassenger,
        string _name,
        string _surname,
        uint _age,
        uint _timestamp
    )
        requireIsOperational 
        external                        
    {
        flightSuretyData.registerPassenger(
            _addressAirline, _flight, _addressPassenger, 
            _name, _surname, _age, _timestamp);
        emit RegisterPassengerEvent(_addressAirline);
    }
    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus
                                (
                                    address _airline,
                                    string memory _flight,
                                    uint256 _timestamp,
                                    uint8 _statusCode
                                )
                                internal
    {
        flightSuretyData.processFlightStatus(_airline, _flight, _timestamp, _statusCode);
        emit ProcessedFlightEvent(_flight);
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            string flight,
                            uint256 timestamp                            
                        )
                        external
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

    function buy(
        address _addressAirline,
        string _flight,
        address _passengerAddress,
        uint _amount,
        uint _multiplier,
        uint _timestamp) 
    external 
    payable 
    requireIsOperational {
        require(msg.value <= AIRLINE_SUBMIT_VALUE, "Insurance value is over limit");       
        flightSuretyData.buy(
            _addressAirline, _flight, _passengerAddress,
             _amount, _multiplier, _timestamp);
        emit BoughtInsuranceEvent(_passengerAddress);
    }
    
    function pay() 
    public 
    requireIsOperational {
        flightSuretyData.pay(msg.sender);
    }


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


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
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
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

// endregion

} 

/*contract ExerciseC6C {
    function updateEmployee(string id, uint256 sales, uint256 bonus) external;
}*/

contract FlightSuretyData {
    address private contractOwner;                                      // Account used to deploy contract
    bool private operational;

    function isOperational() 
                            public 
                            returns(bool) ;
    function setOperatingStatus( bool mode ) 
        external;

    function registerPassenger (
        address airlineAddress,
        string _flight,
        address _passengerAddress,
        string _name,
        string _surname,
        uint _age,
        uint _timestamp
    )
    external;

    function registerFlight(
        address _addressAirline,
        string _flight,
        uint _timestamp
    ) external;

    function registerAirline ( 
        address _addressAirline
        // optional , bool isAdmin 
    )
    external;
    
     function buy (  
        address _addressAirline,
        string _flight,
        address _passengerAddress,
        uint _amount,
        uint _multiplier,
        uint _timestamp
    )
        external
        payable;

    function creditInsurees (
        address _addressAirline,
        string _flight,
        address _passengerAddress,
        uint _timestamp
    ) public;

    function pay (
        address _passengerAddress
    )
    external;

    function processFlightStatus(
        address _addressAirline, 
        string _flight, 
        uint _timestamp, 
        uint _status)
    external;
}
