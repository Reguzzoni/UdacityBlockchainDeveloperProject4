
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  // define objects to share with tests
  
  let airline2 = accounts[2];
  let airline3 = accounts[3];
  let flight1 = "testFlight1";
  let flight2 = "testFlight2";
  let passenger1 = accounts[4];
  let passenger2 = accounts[5];

  let timestamp1 = new Date().getTime();
  let timestamp2 = new Date().getTime();

  let TEST_ORACLES_COUNT = 20;
  
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  //1
  it(`(multiparty) has correct initial isOperational() value`, async function () {
    console.log("Test 1");

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  //2
  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    console.log("Test 2");
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try 
    {
        await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
    }
    catch(e) {
        accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  //3
  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    console.log("Test 3");
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try 
    {
        await config.flightSuretyData.setOperatingStatus(false);
    }
    catch(e) {
        accessDenied = true;
    }
    assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  //4
  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    console.log("Test 3 - rollback");    
    // rollback for previosly test confirmed
    await config.flightSuretyData.setOperatingStatus(true);
    
    console.log("Test 4");
    //console.log('config.flightSuretyData.setOperatingStatus(false); before')
    await config.flightSuretyData.setOperatingStatus(false);
    //console.log('config.flightSuretyData.setOperatingStatus(false); after')

    let reverted = false;
    try 
    {
        await config.flightSurety.isOperational(true);
        console.log(' config.flightSurety.isOperational(true);')
    }
    catch(e) {
        console.log(`Catched error ${e}`)
        reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);

  });

  //5
  it('(airline) get registered airlines', async () => {
    
    console.log("Test 5");

    console.log(`Ready to getAirlines`);
    let countTotal = await config.flightSuretyData.getAirlinesCount(
        {from: config.firstAirline}); 
    let numberAirline = await config.flightSuretyData.getAirlineNumberByAddress(
        config.firstAirline, 
        {from: config.firstAirline});

    console.log(`countTotal airline is : ${countTotal}`);
    console.log(`numberAirline is : ${numberAirline}`);

    // ASSERT
    assert.equal(countTotal, 1, "Empty result");
    assert.equal(numberAirline, 1, "Empty result");
  });
 
  // 6
  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    console.log("Test 6");
    // ARRANGE

    let checkAirlineAlreadyExists = await config.flightSuretyData.getAirlineAddressByNumber(
        2);
    
    let checkNumberAirline = await config.flightSuretyData.getAirlineNumberByAddress(
        airline2);
    
    console.log(`checkAirlineAlreadyExists is : ${checkAirlineAlreadyExists}`);
    console.log(`checkNumberAirline is : ${checkNumberAirline}`);

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(
            airline2, 
            {
                from: airline2
            });
    }
    catch(e) {
        console.log(`Catched error ${e}`)
    }

    checkAirlineAlreadyExists = await config.flightSuretyData.getAirlineAddressByNumber(
        2);
    
    checkNumberAirline = await config.flightSuretyData.getAirlineNumberByAddress(
        airline2);
    
    console.log(`checkAirlineAlreadyExists is : ${checkAirlineAlreadyExists}`);
    console.log(`checkNumberAirline is : ${checkNumberAirline}`);

    // get airlines
    let countTotal = await config.flightSuretyData.getAirlinesCount(); 
    let numberAirline = await config.flightSuretyData.getAirlineNumberByAddress(
        airline2);

    console.log(`countTotal airline is : ${countTotal}`);
    console.log(`numberAirline is : ${numberAirline}`);

    // ASSERT
    assert.equal(countTotal, 1, `Not registered correcly airline cause doesnt result as total`);
    assert.equal(numberAirline, 0 , `Not registered correcly airline cause don't exists numberAirline`);

  });
  
    /**
     * --------- TEST TODO --------- 
     * TEST 7  : AIRLINE - REGISTER AIRLINE with fund
     * TEST 8  : FLIGHT - REGISTER FLIGHT
     * TEST 9  : PASSENGER - REGISTER PASSENGER
     * TEST 10 : PASSENGER - ADD PASSENGER TO MULTIPLE FLIGHT
     * TEST 11 : PASSENGER - INSURANCE
     * TEST 12 : ORACLE - CREATE ORACLE
     * TEST 13 : ORACLE - SET STATUS
     */

     it('(airline) register an Airline using registerAirline() if it is funded', async () => {
    
        console.log("Test 7");
        // ARRANGE
        let fundValueNeeded = web3.utils.toWei("10", "ether");
        
        let checkAirlineAlreadyExists = await config.flightSuretyData.getAirlineAddressByNumber(
            2);
        
        let checkNumberAirline = await config.flightSuretyData.getAirlineNumberByAddress(
            airline2);
        
        console.log(`checkAirlineAlreadyExists is : ${checkAirlineAlreadyExists}`);
        console.log(`checkNumberAirline is : ${checkNumberAirline}`);

        // ACT
        try {
            await config.flightSuretyApp.fund(
                airline2,
                {
                    from: airline2,
                    value: fundValueNeeded
                }
            );
            await config.flightSuretyApp.registerAirline(
                airline2, 
                {
                    from: airline2
                });
        }
        catch(e) {
            console.log(`Catched error ${e}`)
        }
    
        // get airlines
        let countTotal = await config.flightSuretyData.getAirlinesCount(); 
        let numberAirline = await config.flightSuretyData.getAirlineNumberByAddress(
            airline2);
    
        console.log(`countTotal airline is : ${countTotal}`);
        console.log(`numberAirline is : ${numberAirline}`);
    
        // ASSERT
        assert.equal(countTotal, 2, ` correcly airline cause doesnt result as total`);
        assert.equal(numberAirline, 2, ` correcly airline cause don't exists numberAirline`);
    
      });

      it('(flight) register a flight using registerFlight()', async () => {
    
        console.log("Test 8");
        
        // ARRANGE
        // ACT
        try {
            await config.flightSuretyApp.registerFlight(
                airline2,
                flight1,
                timestamp1, 
                {
                    from: airline2
                });
        }
        catch(e) {
            console.log(`Catched error ${e}`)
        }
    
        // get airlines
        let countTotal = await config.flightSuretyData.getFlightCount(); 
        let isFlight = await config.flightSuretyData.isFlight(
            airline2,
            flight1,
            timestamp1);
    
        console.log(`countTotal flight is : ${countTotal}`);
        console.log(`isFlight is : ${isFlight}`);
    
        // ASSERT
        assert.equal(countTotal, 1, ` correcly flight cause doesnt result as total`);
        assert.equal(isFlight, true, ` correcly flight cause don't exists numberAirline`);
    });

    it('(passenger) register a passenger using registerPassenger()', async () => {
    
        console.log("Test 9");
        
        // ARRANGE        
        try {
            await config.flightSuretyApp.registerFlight(
                airline2,
                flight2,
                timestamp2, 
                {
                    from: airline2
                });
        }
        catch(e) {
            console.log(`Catched error ${e}`)
        }

        // ACT
        try {
            await config.flightSuretyApp.registerPassenger(
                airline2,
                flight2,
                passenger1,
                "testName", 
                "testSurname", 
                18,
                timestamp2,
                {
                    from: airline2
                });
        }
        catch(e) {
            console.log(`Catched error ${e}`)
        }
    
        // get airlines
        let countTotal = await config.flightSuretyData.getPassengerCountByFlight(
            airline2,
            flight2,
            timestamp2,
        ); 
        let isPassenger = await config.flightSuretyData.isPassenger(
            airline2,
            flight2,
            timestamp2,
            passenger1);
    
        console.log(`countTotal passenger is : ${countTotal}`);
        console.log(`isPassenger is : ${isPassenger}`);
    
        // ASSERT
        assert.equal(countTotal, 1, ` correcly Passenger cause doesnt result as total`);
        assert.equal(isPassenger, true, ` correcly Passenger cause don't exists numberAirline`);
    });

    
    it('(passenger) register a passenger using registerPassenger() to another fligth', async () => {
    
        console.log("Test 10");
        
        // ACT
        try {
            await config.flightSuretyApp.registerPassenger(
                airline2,
                flight1,
                passenger1,
                "testName", 
                "testSurname", 
                18,
                timestamp1,
                {
                    from: airline2
                });
        }
        catch(e) {
            console.log(`Catched error ${e}`)
        }
    
        // get airlines
        let countTotal = await config.flightSuretyData.getPassengerCountByFlight(
            airline2,
            flight1,
            timestamp1,
        ); 
        let isPassenger = await config.flightSuretyData.isPassenger(
            airline2,
            flight1,
            timestamp1,
            passenger1);
    
        console.log(`countTotal passenger is : ${countTotal}`);
        console.log(`isPassenger is : ${isPassenger}`);
    
        // ASSERT
        assert.equal(countTotal, 1, `registered correcly Passenger cause doesnt result as total`);
        assert.equal(isPassenger, true, `registered correcly Passenger cause don't exists numberAirline`);
    });

    it('(passenger)  buy ', async () => {
      let result = false;
      try {

        let isAuthorized = await config.flightSuretyData.isAuthorizedCaller(passenger1);
        console.log(`is authorized caller :${isAuthorized}`);

        let checkIsPassenger = await config.flightSuretyData.isPassenger(
            airline2,
            flight1,
            timestamp1,
            passenger1);
    
        console.log(`checkIsPassenger is : ${checkIsPassenger}`);

        let insurance_cost = web3.utils.toWei("1", "ether");

        await config.flightSuretyApp.buy(
            airline2, 
            flight1, 
            passenger1,
            timestamp1, 
            {
                from: passenger1, 
                value: insurance_cost
            });
      }
      catch(e) {
        console.log(`Catched error ${e}`);
      }

      result = await config.flightSuretyData.hasInsurance(
        airline2, 
        flight1, 
        passenger1,
        timestamp1,
        {
            from: passenger1
        }
      );

      let numberAllInsurance = await config.flightSuretyData.getCountInsurance();

      let numberInsurance = await config.flightSuretyData.getInsurance(
        airline2, 
        flight1, 
        passenger1,
        timestamp1,
        {
            from: passenger1
        }
      );
      
      console.log(`numberInsurance : ${numberInsurance}`)
      console.log(`numberAllInsurance : ${numberAllInsurance}`)
      assert.equal(result, true, "Passenger can buy insurance");
    });  

});
