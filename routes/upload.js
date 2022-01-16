const { createAlchemyWeb3 } = require("@alch/alchemy-web3")
const { exec } = require('child_process');

const consts = require('../utils/const');
const contract = require('../artifacts/contracts/HoloNFT.sol/HoloNFT.json');

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const express = require('express');
const FormData = require('form-data');
const util = require('ethereumjs-util')

require("dotenv").config();
const API_URL = process.env.API_URL;
const web3 = createAlchemyWeb3(API_URL);
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;
const contractAddress = "0x1221F89B11e36d28595485372269d6F1fd576FBa";
const my_address = "0x5D88f6EC856F54A4D9C31e63B95e818966139841";

const router = express.Router();

/* POST file upload. */
router.post('/', function(req, res, next) {
    // get image from req
    encrypted_buf = req.body;
    if (encrypted_buf.length > 5000000) {
        res.status(400).send("Data sent is greater than max size (5MB).");
        return;
    }
    const data_dir = path.dirname(__dirname) + "/data/";
    const enc_file = "encrypted.dat";
    const packed_file = "packed.png";
    const container_file = "container.png";

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

             // upload to Pinata
             const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

             let data = new FormData();
             data.append('file', fs.createReadStream(data_dir + packed_file));

             axios
                 .post(url, data, {
                     maxBodyLength: 'Infinity', //this is needed to prevent axios from erroring out with large files
                     headers: {
                         'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
                         pinata_api_key: PINATA_API_KEY,
                         pinata_secret_api_key: PINATA_API_SECRET
                     }
                 })
                 .then(function (response) {
                     let ipfs_hash = response.data.IpfsHash;
                     // now create NFT
                     let nft_metadata = {
                         "attributes": [
                             {
                                 "trait_type": "Breed",
                                 "value": "Bones"
                             },
                             {
                                 "trait_type": "Eye color",
                                 "value": "Sullen"
                             }
                         ],
                         "description": "A skull.",
                         "image": "https://gateway.pinata.cloud/ipfs/" + ipfs_hash,
                         "name": "Skully"
                     }
                     const json_url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
                     axios.post(json_url, nft_metadata, {
                         headers: {
                             pinata_api_key: PINATA_API_KEY,
                             pinata_secret_api_key: PINATA_API_SECRET
                         }
                     })
                         .then(async function (response) {
                             let json_cid = response.data.IpfsHash;

                             const nftContract = new web3.eth.Contract(contract.abi, contractAddress)

                             const nonce = await web3.eth.getTransactionCount(my_address, 'latest'); //get latest nonce

                             //the transaction
                             const tx = {
                                 'from': my_address,
                                 'to': contractAddress,
                                 'nonce': nonce,
                                 'gas': 500000,
                                 'data': nftContract.methods.mintNFT("https://gateway.pinata.cloud/ipfs/" + json_cid).encodeABI()
                             };

                             const signPromise = web3.eth.accounts.signTransaction(tx, process.env.PRIVATE_KEY)
                             signPromise
                                 .then((signedTx) => {
                                     web3.eth.sendSignedTransaction(
                                         signedTx.rawTransaction,
                                         function (err, hash) {
                                             if (!err) {
                                                 console.log(
                                                     "The hash of your transaction is: ",
                                                     hash,
                                                     "\nCheck Alchemy's Mempool to view the status of your transaction!"
                                                 );
                                             } else {
                                                 console.log(
                                                     "Something went wrong when submitting your transaction:",
                                                     err
                                                 );
                                             }
                                         }
                                     )
                                 })
                                 .catch((err) => {
                                     console.log(" Promise failed:", err);
                                 });
                         })
                         .catch(function (error) {
                             //handle error here
                             console.log(error);
                         });

                 })
                 .catch(function (error) {
                     //handle error here
                     console.log(error);
                 })
                 .finally(() => {
                     // send it back as a download in res
                     res.sendFile(pack_file_path, packed_file);

                     // clean up
                     exec("rm " + enc_file_path + " " + pack_file_path + " "
                          + container_file_path,
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
                 });
         });
});

module.exports = router;
