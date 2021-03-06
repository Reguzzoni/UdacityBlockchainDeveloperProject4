
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

    var config;
    // define objects to share with tests

    let airline2 = accounts[2];
    let airline3 = accounts[3];
    let airline4 = accounts[4];
    let airline5 = accounts[5];
    let airline6 = accounts[6];
    let airline7 = accounts[7];
    let flight1 = "ND1309";
    let flight2 = "ND1310";
    let passenger1 = accounts[8];

    let timestamp1 = new Date().getTime();
    let timestamp2 = new Date().getTime();

    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.firstAirline);
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    //1
    it(`(multiparty) has correct initial isOperational() value`, async function () {
        //DEBUG console.log("Test 1");

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");

    });

    //2
    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
        //DEBUG console.log("Test 2");
        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false, { from: airline2 });
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

    });

    //3
    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
        //DEBUG console.log("Test 3");
        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false);
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

    });

    //4
    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
        //DEBUG console.log("Test 3 - rollback");
        // rollback for previosly test confirmed
        await config.flightSuretyData.setOperatingStatus(true);

        //DEBUG console.log("Test 4");
        ////DEBUG console.log('config.flightSuretyData.setOperatingStatus(false); before')
        await config.flightSuretyData.setOperatingStatus(false);
        ////DEBUG console.log('config.flightSuretyData.setOperatingStatus(false); after')

        let reverted = false;
        try {
            await config.flightSuretyData.isOperational(true);
        }
        catch (e) {
            //DEBUG console.log(`Catched error ${e}`)
            reverted = true;
        }
        assert.equal(reverted, false, "Access not blocked for requireIsOperational");

        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);

    });

    //5
    it('(airline) get registered airlines', async () => {

        //DEBUG console.log("Test 5");

        //DEBUG console.log(`Ready to getAirlines`);
        let countTotal;
        let numberAirline;

        try {
            countTotal = await config.flightSuretyData.getAirlinesCount();
            //DEBUG console.log(`countTotal airline is : ${countTotal}`);

            numberAirline = await config.flightSuretyData.getAirlineNumberByAddress(
                config.firstAirline);
            //DEBUG console.log(`numberAirline is : ${numberAirline}`);
            //DEBUG console.log(`config.firstAirline is : ${config.firstAirline}`);

        } catch (e) {
            //DEBUG console.log(`Error :${e}`)
        }
        // ASSERT
        assert.equal(countTotal, 1, "Empty result");
        assert.equal(numberAirline, 1, "Empty result");
    });

    // 6
    it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {

        //DEBUG console.log("Test 6");
        // ARRANGE
        await config.flightSuretyData.authorizeCaller(config.firstAirline);
        let isAuthorized = await config.flightSuretyData.isAuthorizedCaller(config.firstAirline);
        //DEBUG console.log(`is authorized caller :${isAuthorized}`);

        let checkAirlineAlreadyExists = await config.flightSuretyData.getAirlineAddressByNumber(
            1);

        let checkNumberAirline = await config.flightSuretyData.getAirlineNumberByAddress(
            config.firstAirline);

        //DEBUG console.log(`checkAirlineAlreadyExists is : ${checkAirlineAlreadyExists}`);
        //DEBUG console.log(`checkNumberAirline is : ${checkNumberAirline}`);

        // ACT
        try {
            await config.flightSuretyApp.registerAirline(
                airline2,
                {
                    from: config.firstAirline
                });
        }
        catch (e) {
            //DEBUG console.log(`Catched error ${e}`)
        }

        checkAirlineAlreadyExists = await config.flightSuretyData.getAirlineAddressByNumber(
            2);

        checkNumberAirline = await config.flightSuretyData.getAirlineNumberByAddress(
            airline2);

        //DEBUG console.log(`checkAirlineAlreadyExists is : ${checkAirlineAlreadyExists}`);
        //DEBUG console.log(`checkNumberAirline is : ${checkNumberAirline}`);

        // get airlines
        let countTotal = await config.flightSuretyData.getAirlinesCount();
        let numberAirline = await config.flightSuretyData.getAirlineNumberByAddress(
            airline2);

        //DEBUG console.log(`countTotal airline is : ${countTotal}`);
        //DEBUG console.log(`numberAirline is : ${numberAirline}`);

        // ASSERT
        assert.equal(countTotal, 1, `Not registered correcly airline cause doesnt result as total`);
        assert.equal(numberAirline, 0, `Not registered correcly airline cause don't exists numberAirline`);

    });

    /**
     * --------- TEST TODO --------- 
     * TEST 7.a : AIRLINE - REGISTER AIRLINE with fund
     * TEST 7.b : AIRLINE - REGISTER AIRLINE error cause created by not registered account
     * TEST 8  : FLIGHT - REGISTER FLIGHT
     * TEST 9  : PASSENGER - REGISTER PASSENGER
     * TEST 10 : PASSENGER - ADD PASSENGER TO MULTIPLE FLIGHT
     * TEST 11 : PASSENGER - BUY INSURANCE
     * TEST 12 : PASSENGER - CREDIT INSURANCE
     * TEST 13 : AIRLINE - REGISTER MULTIPLE INSTANCE UNTIL 4
     * TEST 14 : AIRLINE - CANT GO OVER 4 WITHOUT CONSENSUS 50%
     * TEST 15 : ORACLE - REGISTER ORACLES
     * TEST 16 : ORACLE - SIMULATE SERVER SUBMITTING STATUS FLIGHT BY ORACLE
     */

    it('(airline) register an Airline using registerAirline() if it is funded', async () => {

        //DEBUG console.log("Test 7.a");
        // ARRANGE
        let fundValueNeeded = web3.utils.toWei("10", "ether");

        let checkAirlineAlreadyExists = await config.flightSuretyData.getAirlineAddressByNumber(
            1);

        let checkNumberAirline = await config.flightSuretyData.getAirlineNumberByAddress(
            config.firstAirline);

        //DEBUG console.log(`checkAirlineAlreadyExists is : ${checkAirlineAlreadyExists}`);
        //DEBUG console.log(`checkNumberAirline is : ${checkNumberAirline}`);

        await config.flightSuretyData.authorizeCaller(config.firstAirline);
        let isAuthorized = await config.flightSuretyData.isAuthorizedCaller(config.firstAirline);
        //DEBUG console.log(`is authorized caller :${isAuthorized}`);

        // ACT
        try {
            //DEBUG console.log("Start Fund");
            await config.flightSuretyApp.fund(
                airline2,
                {
                    from: airline2,
                    value: fundValueNeeded
                }
            );

            //check is funded
            let isFundedAirline2 = await config.flightSuretyData.isFund(
                airline2
            );

            //DEBUG console.log(`Check are funded 
            //DEBUG    isFundedAirline2 : ${isFundedAirline2}`)

            //DEBUG console.log("Start Register airline");
            await config.flightSuretyApp.registerAirline(
                airline2,
                {
                    from: config.firstAirline
                });
        }
        catch (e) {
            //DEBUG console.log(`Catched error ${e}`)
        }

        // get airlines
        let countTotal = await config.flightSuretyData.getAirlinesCount();
        let numberAirline = await config.flightSuretyData.getAirlineNumberByAddress(
            airline2);

        //DEBUG console.log(`countTotal airline is : ${countTotal}`);
        //DEBUG console.log(`numberAirline is : ${numberAirline}`);

        // ASSERT
        assert.equal(countTotal, 2, `  doesnt result as total`);
        assert.equal(numberAirline, 2, `  don't exists numberAirline`);

    });

    // check register airline multicalls
    it('(airline) only existing accounts can register an airlines', async () => {

        //DEBUG console.log("Test 7b");
        // ARRANGE
        let fundValueNeeded = web3.utils.toWei("10", "ether");

        let checkAirlineAlreadyExists = await config.flightSuretyData.getAirlineAddressByNumber(
            6);

        let checkNumberAirline = await config.flightSuretyData.getAirlineNumberByAddress(
            airline6);

        //DEBUG console.log(`checkAirlineAlreadyExists is : ${checkAirlineAlreadyExists}`);
        //DEBUG console.log(`checkNumberAirline is : ${checkNumberAirline}`);

        // ACT
        try {
            //DEBUG console.log(`Start fund airline 7`);
            await config.flightSuretyApp.fund(
                airline7,
                {
                    from: airline6,
                    value: fundValueNeeded
                }
            );

            //check is funded
            let isFundedAirline7 = await config.flightSuretyData.isFund(
                airline7
            );

            //DEBUG console.log(`Check are funded 
            //DEBUG       isFundedAirline7 : ${isFundedAirline7}`)


            //DEBUG console.log(`Start register airline 7`);
            await config.flightSuretyApp.registerAirline(
                airline7,
                {
                    from: airline6
                });
        }
        catch (e) {
            //DEBUG console.log(`Catched error ${e}`)
        }

        // get airlines
        let countTotal = await config.flightSuretyData.getAirlinesCount();
        let numberAirline7 = await config.flightSuretyData.getAirlineNumberByAddress(
            airline7);

        //DEBUG console.log(`countTotal airline is : ${countTotal}`);
        //DEBUG console.log(`numberAirline7 is : ${numberAirline7}`);

        // ASSERT
        assert.equal(countTotal, 2, ` doesnt result as total`);
        assert.equal(numberAirline7, 0, ` don't exists numberAirline`);

    });

    it('(flight) register a flight using registerFlight()', async () => {

        //DEBUG //DEBUG console.log("Test 8");

        await config.flightSuretyData.authorizeCaller(airline2);
        let isAuthorized = await config.flightSuretyData.isAuthorizedCaller(airline2);
        //DEBUG console.log(`is authorized caller :${isAuthorized}`);

        // ARRANGE
        // ACT
        try {
            await config.flightSuretyApp.registerFlight(
                airline2,
                flight1,
                airline2,
                {
                    from: airline2
                });
        }
        catch (e) {
            //DEBUG console.log(`Catched error ${e}`)
        }

        let flightinfo = await config.flightSuretyData.getFlightInfo(airline2, flight1);
        //DEBUG console.log(`flightinfo : ${flightinfo.toString()}`);

        // get airlines
        let countTotal = await config.flightSuretyData.getFlightCount();
        let isFlight = await config.flightSuretyData.isFlight(
            airline2,
            flight1);

        //DEBUG console.log(`countTotal flight is : ${countTotal}`);
        //DEBUG console.log(`isFlight is : ${isFlight}`);

        // ASSERT
        assert.equal(countTotal, 1, ` doesnt result as total`);
        assert.equal(isFlight, true, ` don't exists flight`);
    });

    it('(passenger) register a passenger using registerPassenger()', async () => {

        //DEBUG console.log("Test 9");

        // ARRANGE        
        try {
            await config.flightSuretyApp.registerFlight(
                airline2,
                flight2,
                airline2,
                {
                    from: airline2
                });
        }
        catch (e) {
            //DEBUG console.log(`Catched error ${e}`)
        }

        // ACT
        try {
            await config.flightSuretyApp.registerPassenger(
                airline2,
                flight2,
                passenger1,
                "testName",
                "testSurname",
                {
                    from: airline2
                });
        }
        catch (e) {
            //DEBUG console.log(`Catched error ${e}`)
        }

        // get airlines
        let countTotal = await config.flightSuretyData.getPassengerCountByFlight(
            airline2,
            flight2,
        );
        let isPassenger = await config.flightSuretyData.isPassenger(
            airline2,
            flight2,
            passenger1);

        //DEBUG console.log(`countTotal passenger is : ${countTotal}`);
        //DEBUG console.log(`isPassenger is : ${isPassenger}`);

        // ASSERT
        assert.equal(countTotal, 1, ` doesnt result as total`);
        assert.equal(isPassenger, true, ` don't exists isPassenger`);
    });


    it('(passenger) register a passenger using registerPassenger() to another fligth', async () => {

        //DEBUG console.log("Test 10");

        // ACT
        try {
            await config.flightSuretyApp.registerPassenger(
                airline2,
                flight1,
                passenger1,
                "testName",
                "testSurname",
                {
                    from: passenger1
                });
        }
        catch (e) {
            //DEBUG console.log(`Catched error ${e}`)
        }
        
        // get airlines
        let countTotal = await config.flightSuretyData.getPassengerCountByFlight(
            airline2,
            flight1,
        );
        let isPassenger = await config.flightSuretyData.isPassenger(
            airline2,
            flight1,
            passenger1);

        let passengerInfo = await config.flightSuretyData.getPassengerInfo(
            airline2,
            flight1,
            1);

        //DEBUG console.log(`countTotal passenger is : ${countTotal}`);
        //DEBUG console.log(`isPassenger is : ${isPassenger}`);
        //DEBUG console.log(`passengerInfo is : ${passengerInfo}`);

        // ASSERT
        assert.equal(countTotal, 1, `doesnt result as total`);
        assert.equal(isPassenger, true, `don't exists passenger`);
    });

    it('(passenger)  buy ', async () => {
        let result = false;
        //DEBUG console.log("Test 11");
        try {

            await config.flightSuretyData.authorizeCaller(passenger1);
            let isAuthorized = await config.flightSuretyData.isAuthorizedCaller(passenger1);
            //DEBUG console.log(`is authorized caller :${isAuthorized}`);

            let checkIsPassenger = await config.flightSuretyData.isPassenger(
                airline2,
                flight1,
                passenger1);

            //DEBUG console.log(`checkIsPassenger is : ${checkIsPassenger}`);

            let insurance_cost = web3.utils.toWei("1", "ether");

            await config.flightSuretyApp.buy(
                airline2,
                flight1,
                passenger1,
                {
                    from: passenger1,
                    value: insurance_cost
                });
        }
        catch (e) {
            //DEBUG console.log(`Catched error ${e}`);
        }

        result = await config.flightSuretyData.hasInsurance(
            airline2,
            flight1,
            passenger1,
            {
                from: passenger1
            }
        );

        let numberAllInsurance = await config.flightSuretyData.getCountInsurance();

        let numberInsurance = await config.flightSuretyData.getInsurance(
            airline2,
            flight1,
            passenger1,
            {
                from: passenger1
            }
        );

        //DEBUG console.log(`numberInsurance : ${numberInsurance}`)
        //DEBUG console.log(`numberAllInsurance : ${numberAllInsurance}`)
        assert.equal(result, true, "Passenger cant buy insurance");
    });

    it('(passenger)  credit ', async () => {

        //DEBUG console.log("Test 12");
        try {

            let checkIsPassenger = await config.flightSuretyData.isPassenger(
                airline2,
                flight1,
                passenger1);

            //DEBUG console.log(`checkIsPassenger is : ${checkIsPassenger}`);

            await config.flightSuretyData.creditInsurees(
                airline2,
                flight1,
                passenger1,
                {
                    from: passenger1
                });
        }
        catch (e) {
            //DEBUG console.log(`Catched error ${e}`);
        }

        let isPayed = await config.flightSuretyData.isPayed(
            airline2,
            flight1,
            passenger1,
            {
                from: passenger1
            }
        );

        //DEBUG console.log(`isPayed : ${isPayed}`)
        assert.equal(isPayed, true, "Passenger can buy insurance");
    });


    // check register airline multicalls
    it('(airline) register multiple airline until 4', async () => {

        //DEBUG console.log("Test 13");
        // ARRANGE
        let fundValueNeeded = web3.utils.toWei("10", "ether");

        // ACT
        try {
            //DEBUG console.log(`Start fund airline 3`);
            await config.flightSuretyApp.fund(
                airline3,
                {
                    from: airline3,
                    value: fundValueNeeded
                }
            );
            //DEBUG console.log(`Start fund airline 4`);
            await config.flightSuretyApp.fund(
                airline4,
                {
                    from: airline4,
                    value: fundValueNeeded
                }
            );

            //check is funded
            let isFundedAirline3 = await config.flightSuretyData.isFund(
                airline3
            );

            let isFundedAirline4 = await config.flightSuretyData.isFund(
                airline4
            );

            //DEBUG console.log(`Check are funded 
            //DEBUG    isFundedAirline3 : ${isFundedAirline3}
            //DEBUG    isFundedAirline4 : ${isFundedAirline4}`)


            //DEBUG console.log(`Start register airline 3`);
            await config.flightSuretyApp.registerAirline(
                airline3,
                {
                    from: airline2
                });
            //DEBUG console.log(`Start register airline 4`);
            await config.flightSuretyApp.registerAirline(
                airline4,
                {
                    from: airline2
                });
        }
        catch (e) {
            //DEBUG console.log(`Catched error ${e}`)
        }

        // get airlines
        let countTotal = await config.flightSuretyData.getAirlinesCount();
        let numberAirline3 = await config.flightSuretyData.getAirlineNumberByAddress(
            airline3);
        let numberAirline4 = await config.flightSuretyData.getAirlineNumberByAddress(
            airline4);

        //DEBUG console.log(`countTotal airline is : ${countTotal}`);
        //DEBUG console.log(`numberAirline3 is : ${numberAirline3}`);
        //DEBUG console.log(`numberAirline4 is : ${numberAirline4}`);

        // ASSERT
        assert.equal(countTotal, 4, `  doesnt result as total`);
        assert.equal(numberAirline3, 3, `  don't exists numberAirline3`);
        assert.equal(numberAirline4, 4, `  don't exists numberAirline4`);

    });

    it('(multicall) register multiple airline after 4, consensus 50%', async () => {

        //DEBUG console.log("Test 14");
        // ARRANGE
        let fundValueNeeded = web3.utils.toWei("10", "ether");

        // ACT
        try {
            //DEBUG console.log(`Start fund airline 5`);
            await config.flightSuretyApp.fund(
                airline5,
                {
                    from: airline5,
                    value: fundValueNeeded
                }
            );

            //check is funded
            let isFundedAirline5 = await config.flightSuretyData.isFund(
                airline5
            );

            //DEBUG console.log(`Check are funded 
            //DEBUG    isFundedAirline5 : ${isFundedAirline5}`)


            //DEBUG console.log(`Start register airline 5`);
            await config.flightSuretyApp.registerAirline(
                airline5,
                {
                    from: airline2
                });
        }
        catch (e) {
            //DEBUG console.log(`Catched error ${e}`)
        }

        // get airlines
        let countTotal = await config.flightSuretyData.getAirlinesCount();
        let numberAirline5 = await config.flightSuretyData.getAirlineNumberByAddress(
            airline5);

        //DEBUG console.log(`countTotal airline is : ${countTotal}`);
        //DEBUG console.log(`numberAirline5 is : ${numberAirline5}`);

        // ASSERT
        assert.equal(countTotal, 4, ` doesnt result as total`);
        assert.equal(numberAirline5, 0, ` don't exists numberAirline`);

    });

    it("(oracle) Register oracles",
        async () => {
            //DEBUG console.log("Test 15");
            // ARRANGE
            let valueNeeded = web3.utils.toWei("1", "ether");
            const TEST_ORACLES_COUNT = 10;
            const OFFSET = 10;

            // ACT
            //DEBUG console.log("Start register");
            for (let idxAccountOracle = OFFSET;
                idxAccountOracle < (TEST_ORACLES_COUNT + OFFSET);
                idxAccountOracle++) {
                //DEBUG console.log(`Start register oracle with 
                //DEBUGid ${idxAccountOracle}
                //DEBUGand account ${accounts[idxAccountOracle]}`);

                await config.flightSuretyApp.registerOracle(
                    {
                        from: accounts[idxAccountOracle],
                        value: valueNeeded,
                        gas: 300000
                    });
                //DEBUG console.log(`get oracle indexed with id ${idxAccountOracle}`);

                let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call(
                    {
                        from: accounts[idxAccountOracle]
                    });
                assert.equal(oracleIndexes.length, 3, 'Oracle should be registered with three indexes');
            }
        });

    it("(oracle) Simulating server",
        //Server will loop through all registered oracles, identify those oracles for which the OracleRequest event applies,
        // and respond by calling into FlightSuretyApp contract with random status code"
        async () => {
            //DEBUG console.log("Test 16");
            // ARRANGE
            let _airline = airline2;
            let _flight = flight1;
            let _timestamp = new Date().getTime();

            // Submit a request for oracles to get status information for a flight
            await config.flightSuretyApp.fetchFlightStatus(_airline, _flight, _timestamp);

            const TEST_ORACLES_COUNT = 10;
            const OFFSET = 10;
            const STATUS_CODE_LATE_AIRLINE = 20;

            //idxAccountOracle = accounts dedicated to oracle
            for (let idxAccountOracle = OFFSET;
                idxAccountOracle < (TEST_ORACLES_COUNT + OFFSET);
                idxAccountOracle++) {

                let oracleIndexes = await config.flightSuretyApp.getMyIndexes(
                    {
                        from: accounts[idxAccountOracle]
                    });

                //oracleIndexes = oracle indexes (random number generated in smart contract)
                for (let idx = 0; idx < 3; idx++) {
                    try {

                        let _isOpen = await config.flightSuretyApp.isOpenOracleResponse(
                            oracleIndexes[idx],
                            _airline,
                            _flight,
                            _timestamp
                        );

                        ////DEBUG console.log("_isOpen : ", _isOpen)
                        
                        if (_isOpen) {
                            try {
                                
                                await config.flightSuretyData.authorizeCaller(accounts[idxAccountOracle]);
                                let isAuthorized = await config.flightSuretyData.isAuthorizedCaller(accounts[idxAccountOracle]);
                                //DEBUG console.log(`is authorized caller :${isAuthorized}`);
                                
                                //DEBUG console.log(`submit response STATUS_CODE_LATE_AIRLINE 
                                //DEBUG airline : ${_airline}
                                //DEBUG flight : ${_flight}
                                //DEBUG accountOracle : ${accounts[idxAccountOracle]}
                                //DEBUG `
                                //DEBUG );
                                /*
                                with info 
                                    accountOracle : ${accounts[idxAccountOracle]}
                                    airline : ${_airline}
                                    flight : ${_flight}
                                    _timestamp : ${_timestamp}
                                    idxAccountOracle : ${idxAccountOracle},
                                    oracleIndexes : ${JSON.stringify(oracleIndexes)},
                                    oracleIndexes[idx] ${oracleIndexes[idx]}
                                    isAuthorized: ${isAuthorized}
                                */

                                await config.flightSuretyApp.submitOracleResponse(
                                    oracleIndexes[idx],
                                    _airline,
                                    _flight,
                                    _timestamp,
                                    STATUS_CODE_LATE_AIRLINE,
                                    accounts[idxAccountOracle],
                                    {
                                        from: accounts[idxAccountOracle]
                                    });
                                
                            } catch (error) {
                                //DEBUG console.log("Error into submit oracle Response!", error)
                            }
                        }
                    } catch (e) {
                        // someone will be accepted cause of random index
                        /*//DEBUG console.log(`Error
                        idx : ${idx}, 
                        oracleIndexes[idx] : ${oracleIndexes[idx]},
                        flight :  ${_flight}, 
                        timestamp : ${_timestamp},
                        error cause : ${e}`);*/
                    }
                }
            }

            // check 
            let checkAirlineExists = await config.flightSuretyData.getAirlineNumberByAddress(_airline);
            let checkFlightExists = await config.flightSuretyData.isFlight(_airline, _flight);
            let isPassenger = await config.flightSuretyData.isPassenger(
                _airline,
                _flight,
                passenger1);

            
            //DEBUG console.log("airline", _airline);
            //DEBUG console.log("fligth", _flight);
            //DEBUG console.log(`checkAirlineExists : ${checkAirlineExists}`);
            //DEBUG console.log(`checkFlightExists : ${checkFlightExists}`);
            //DEBUG console.log(`isPassenger : ${isPassenger}`);
            
            let flightinfo = await config.flightSuretyData.getFlightInfo(_airline, _flight);
            //DEBUG console.log(`flightinfo BEFORE : ${flightinfo.toString()}`);

            /*await config.flightSuretyData.processFlightStatus(
                _airline, 
                _flight,
                STATUS_CODE_LATE_AIRLINE,
                _timestamp,
                _airline);
            flightinfo = await config.flightSuretyData.getFlightInfo(_airline, _flight);
            //DEBUG console.log(`flightinfo : ${flightinfo.toString()}`);

            let flightStatus = await config.flightSuretyData.getFlightStatus(_airline, _flight);
            //DEBUG console.log(`flightStatus : ${flightStatus.toString()}`);
            assert.equal(STATUS_CODE_LATE_AIRLINE, flightStatus, 'Oracle didnt change status');*/
        });

});
