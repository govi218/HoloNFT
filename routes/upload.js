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
const contractAddress = "0xa9e59ed8375AeD9dEd7B84f256A6fa795f867ebF";

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
                             const pvt_key_buff = Buffer.from(process.env.PRIVATE_KEY, "hex");

                             const pub_key_buff = util.privateToPublic(pvt_key_buff);
                             // const pub_key = pub_key_buff.toString('hex');
                             const pub_key = "0x5D88f6EC856F54A4D9C31e63B95e818966139841";

                             console.log(pub_key);
                             const nonce = await web3.eth.getTransactionCount(pub_key, 'latest'); //get latest nonce

                             //the transaction
                             const tx = {
                                 'from': pub_key,
                                 'to': contractAddress,
                                 'nonce': nonce,
                                 'gas': 500000,
                                 'data': nftContract.methods.mintNFT(pub_key, "https://gateway.pinata.cloud/ipfs/" + json_cid).encodeABI()
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
                 });
         });
});

module.exports = router;
