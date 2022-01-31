var express = require('express');
var router = express.Router();

var holoNFTContract = require("../artifacts/contracts/HoloNFT.sol/HoloNFT.json");

/* GET home page. */
router.get('/', function(req, res, next) {
    res.json(holoNFTContract);
});

module.exports = router;
