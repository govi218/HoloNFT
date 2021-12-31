const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const express = require('express');

const router = express.Router();

/* POST file upload. */
router.post('/', function(req, res, next) {
    // get image from req
    encrypted_buf = req.body;
    const data_dir = path.dirname(__dirname) + "/data/";
    const enc_file = "encrypted.dat";
    const packed_file = "packed.png";
    const container_file = "3mb.png";

    const container_file_path = data_dir + container_file;
    const pack_file_path = data_dir + packed_file;
    const enc_file_path = data_dir + enc_file;

    fs.writeFileSync(data_dir + enc_file, encrypted_buf);

    // make subprocess to pack encrypted blob
    exec("python pack.py " + container_file_path + " "
         + enc_file_path + " " + pack_file_path,
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

        // send it back as a download in res
        res.sendFile(data_dir + packed_file, packed_file);
    });
});

module.exports = router;
