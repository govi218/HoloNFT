const { createAlchemyWeb3 } = require("@alch/alchemy-web3")
const { exec } = require('child_process');

const consts = require('../utils/const')

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const express = require('express');
const FormData = require('form-data');

require("dotenv").config();
const API_URL = process.env.API_URL;
const web3 = createAlchemyWeb3(API_URL);
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;

const router = express.Router();

/* POST file upload. */
router.post('/', function(req, res, next) {
    // get image from req
    encrypted_buf = req.body;
    const data_dir = path.dirname(__dirname) + "/data/";
    const enc_file = "encrypted.dat";
    const packed_file = "packed.png";
    const container_file = "brain.png";

    const container_file_path = data_dir + container_file;
    const pack_file_path = data_dir + packed_file;
    const enc_file_path = data_dir + enc_file;

    fs.writeFileSync(data_dir + enc_file, encrypted_buf);

    // make subprocess to pack encrypted blob
    exec("python pack.py " + container_file_path + " "
         + enc_file_path + " " + pack_file_path + " " + consts.PACK_SEPARATOR,
    (error, stdout, stderr) => {
        if (error) {
            console.error(`error: ${error.message}`);
            return;
        }

        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }

        console.log(`stdout:\n${stdout}`);

        // upload to Pinata
        const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

        let data = new FormData();
        data.append('file', fs.createReadStream(data_dir + packed_file));

        axios.post(url, data, {
            maxBodyLength: 'Infinity', //this is needed to prevent axios from erroring out with large files
            headers: {
                'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_API_SECRET
            }
        })
        .then(function (response) {
            // now create NFT

            // send it back as a download in res
            res.sendFile(data_dir + packed_file, packed_file);

            // clean up
            exec("rm " + enc_file_path + " " + pack_file_path,
                 (error, stdout, stderr) => {
                     if (error) {
                         console.error(`error: ${error.message}`);
                         return;
                     }

                     if (stderr) {
                         console.error(`stderr: ${stderr}`);
                         return;
                     }

                     console.log("Cleanup successful");
                 });
        })
        .catch(function (error) {
            //handle error here
            console.log(error);
        });
    });
});

module.exports = router;
