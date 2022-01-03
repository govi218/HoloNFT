const consts = require('../utils/const');

const fs = require('fs');
const path = require('path');
const express = require('express');

const router = express.Router();

/* POST file upload. */
router.post('/', function(req, res, next) {
    // get image from req
    carrier_buf = req.body;
    if (carrier_buf.length > 5000000) {
        res.status(400).send("Data sent is greater than max size (5MB).");
        return;
    }
    const data_dir = path.dirname(__dirname) + "/data/";
    const container_file = "container.png";

    const container_file_path = data_dir + container_file;

    fs.writeFileSync(container_file_path, carrier_buf);

    res.status(200).send();
});

module.exports = router;
