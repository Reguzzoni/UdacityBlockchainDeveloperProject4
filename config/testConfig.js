
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
        "0x65e074912d2074e31271377877D7c56a5D1cdad1",
        "0x678872BCEFC920DcA53aDf471E83F35FC72042C8",
        "0x2183f24bB4F30373F032D0756f69185E3a903945",
        "0x0263dDE6275Aa6a5AbaBd2a36811002D29E92a91",
        "0x9fb9b267877034a564C9b3606305445FDa201ebC",
        "0x66174852c352dDc30300b7B58D1Cbdb1E7Ee8A27",
        "0x6F7a878679a32A885cA6C35420F00F122C312f29",
        "0xC14824ac1a6392702F5db74ABA1D7158ad0Ca0d5",
        "0x6A4B4d59E7F27cEb7631fac9a12289Bf92e5790a",
        "0xdb43Ba7De3C0E1512677bCe232c66b397c15ed0a",
        "0x1396494BE57d9247733599aAE0Ddb6b309F82C3e",
        "0x2753923c1da87e532C35C876E28d9ABa5c4458eE",
        "0x29D9BDA1572706CCe2ce94bc97a805Ca51c85186",
        "0xD68904182360A791E3f7f2b5526ca4d5831edEB4",
        "0x1234a84e9aB9635c3aa439a16073Cc1a3FE5129a",
        "0xBb91eDe19426A56eD68CB143897b418ee359D36F",
        "0x6c7948A50EA20645Bad1fE056188a324e99519ba",
        "0xDf609872F5C73946698c2C2Fbd4c33330DFF10f4",
        "0xF91A86E9442D1d80182E58a7Df84A44d43e08761",
        "0xDFA2fc7A4bD4068EFD24Fd8C62434EF08DE1677E",
        "0xa2e126FeD701724e2713675355F9E95Bc3A48d09",
        "0xc9541D3C603FD642780c8A8d7811Cec966EbA85b"

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