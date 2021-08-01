
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        /*"0x69e1CB5cFcA8A311586e3406ed0301C06fb839a2",
        "0xF014343BDFFbED8660A9d8721deC985126f189F3",
        "0x0E79EDbD6A727CfeE09A2b1d0A59F7752d5bf7C9",
        "0x9bC1169Ca09555bf2721A5C9eC6D69c8073bfeB4",
        "0xa23eAEf02F9E0338EEcDa8Fdd0A73aDD781b2A86",
        "0x6b85cc8f612d5457d49775439335f83e12b8cfde",
        "0xcbd22ff1ded1423fbc24a7af2148745878800024",
        "0xc257274276a4e539741ca11b590b9447b26a8051",
        "0x2f2899d6d35b1a48a4fbdc93a37a72f264a9fca7"*/
        "0x67887e63654C93558b1d689c3cF2081B0019a45e",
        "0xD2890b66C82C3F49D01c1eEd3BdF50512287d81E",
        "0x4484957450B62D560CDA969519c81d16c42fE60A",
        "0x0263dDE6275Aa6a5AbaBd2a36811002D29E92a91",
        "0x4E03b8c5a20DED108D89660fe2bAe47346Ac51b7",
        "0x897A2cF9BC130C74f5c03A70209ec2E76d9C26F5",
        "0x4AF75A9568CC5D91155f0620824F311CfedA187d",
        "0x476cA867456dc6f98EF6B0b2eBa12c79627F610F",
        "0x8Af0f7796c081D6dB7e93e60443E5d78805f803a",
        "0xfC32227Ae2B5abF5618594E74A96b1CAb4E0055E"

    ];


    let owner = accounts[10];
    let firstAirline = accounts[9];

    let flightSuretyData = await FlightSuretyData.new(firstAirline);
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);

    
    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};