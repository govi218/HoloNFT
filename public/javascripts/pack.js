const { Readable } = require('stream');
const fs = require('fs');
const utf8 = require('utf8');
const crc32 = require('buffer-crc32');
const axios = require('axios');
const FormData = require('form-data');
const util = require('ethereumjs-util')
const {Blob} = require('node:buffer');
const { createAlchemyWeb3 } = require("@alch/alchemy-web3")
const { exec } = require('child_process');

require('dotenv').config({path:__dirname+'/./../../.env'});

const contract = require('../../artifacts/contracts/HoloNFT.sol/HoloNFT.json');
const API_URL = process.env.API_URL;
const web3 = createAlchemyWeb3(API_URL);
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;
const contractAddress = "0x1221F89B11e36d28595485372269d6F1fd576FBa";
const my_address = "0x5D88f6EC856F54A4D9C31e63B95e818966139841";

// FIXME: Replace with actual PNG magic
const PNG_MAGIC = "PNG";
const CUSTOM_OFFSET_STR = "ENCRYPTED_PAYLOAD";

// buffer cursor
let curr_idx = 0;

let read_bytes_as_int = (curr_idx, carrier_img, len) => {
    let bytes = carrier_img.slice(curr_idx, curr_idx + len);
    let buf = Buffer.from(bytes);
    return buf.readUInt32BE(0);
};

let concat_uint8_arrs = (arr1, arr2) => {
    var mergedArray = new Uint8Array(arr1.length + arr2.length);
    mergedArray.set(arr1);
    mergedArray.set(arr2, arr1.length);
    return mergedArray;
}

let read_chunk = (carrier_img) => {
    let chunk_len = read_bytes_as_int(curr_idx, carrier_img, 4);
    curr_idx += 4;
    let chunk_type = carrier_img.slice(curr_idx, curr_idx + 4);
    curr_idx += 4;
    let chunk_body = carrier_img.slice(curr_idx, curr_idx + chunk_len);
    curr_idx += chunk_len;
    let chunk_csum = read_bytes_as_int(curr_idx, carrier_img, 4);
    curr_idx += 4;

    return {
        "c_len": chunk_len,
        "c_type": chunk_type,
        "c_body": chunk_body,
        "c_csum": chunk_csum
    };
};

const bytes_check = (data) => {
    return (data instanceof Uint8Array);
};

/**
 * Finds the offset in a supplied PNG and retrieves encrypted data.
 * @param HoloNFT A Uint8Array that contains a HoloNFT PNG file
 * @param custom_offset_str The offset str that specifies where the PNG data ends
 * and the encrypted data begins
 * @return a JSON object that has the Uint8Array of encrypted data as well as the
 * initialization vector required to decrypt
 */
function get_encrypted_payload(HoloNFT, custom_offset_str = CUSTOM_OFFSET_STR) {
    if (!bytes_check(HoloNFT))
        throw "HoloNFT needs to be a Uint8Array";
    var t_dec = new TextDecoder("ascii");
    let data_cs = t_dec.decode(HoloNFT);
    let offset = data_cs.indexOf(PACK_SEPARATOR);
    if (offset < 0)
        throw "Uploaded data is not a HoloNFT!";
    let encrypted_data = data_bs.slice(offset + PACK_SEPARATOR.length, data_bs.length - 16);
    let iv = encrypted_data.slice(encoded_data.length - 16, encoded_data.length);
    encrypted_data = encryptded_data.slice(0, encrypted_data.length - 16);

    return {
        "data": encrypted_data,
        "iv": iv
    }
}

/**
 * Creates a steganography image given a carrier image
 * and some binary asset that will be packed into the
 * carrier image. Only supports PNG for carrier img.
 * The binary asset is encrypted using AES-CBC using
 * mozilla's SubtleCrypto library and the symmetric
 * key as well as the packed PNG HoloNFT is returned
 * in a JSON object.
 *
 * @param carrier_img Uint8Array that has the
 * contents of the carrier PNG img
 * @param hidden_asset Uint8Array that has arbitrary
 * binary content to be packed into the carrier
 * @return a JSON object with the HoloNFT Uint8Array
 * as well as the symmetric key. It looks like this:
 * {"HoloNFT": <Uint8Array>, "key": <Uint8Array>}
 */
function createHoloNFT(carrier_img, hidden_asset) {
    if (!(bytes_check(carrier_img) && bytes_check(hidden_asset)))
        throw "Arguments need to be a Uint8Array";
    // get PNG header
    let png_magic_utf8 = utf8.encode(PNG_MAGIC);
    let png_bytes = carrier_img.slice(1, png_magic_utf8.length + 1);

    // FIXME: get actual PNG header length
    curr_idx += 8;

    var t_dec = new TextDecoder("utf-8");
    let data_cs = t_dec.decode(png_bytes);
    let idat_body = new Uint8Array();

    if (data_cs !== png_magic_utf8)
        throw "Carrier file needs to be a PNG!";

    // iterate through chunks of PNG file
    while (true) {
        let chunk = read_chunk(carrier_img);
        let c_type = chunk["c_type"].toString();
        if (c_type !== "IHDR" && c_type !== "PLTE" &&
            c_type !== "IDAT" && c_type !== "IEND") {
            console.log("Warning: dropping non-essential or unknown chunk: " + c_type);
            continue;
        }
        if (c_type === "IHDR") {
            // TODO: get resolution
        }
        if (c_type === "IDAT") {
            idat_body = concat_uint8_arrs(idat_body, chunk["c_body"]);
            continue;
        }
        if (c_type === "IEND") {
            // FIXME: the 33 comes from the header, yet Python uses `png_out.tell()`
            // so this feels a bit suspect
            let start_offset = 33 + 8 + idat_body.length;
            console.log(png_bytes.length);
            console.log("Embedded file starts at offset: " + start_offset.toString(16));

            // add separator string
            var enc = new TextEncoder(); // always utf-8
            let sep_bytes = enc.encode(CUSTOM_OFFSET_STR);
            idat_body = concat_uint8_arrs(idat_body, sep_bytes);

            // add encoded bytes
            console.log(idat_body.length);
            idat_body = concat_uint8_arrs(idat_body, hidden_asset);
            console.log(idat_body.length);

        }

        if (c_type === "IEND")
            break;
    }

    console.log("Done!");
}


/**
 * Publishes an NFT to Ethereum using the Alchemy API.
 * First, the NFT is an ArrayBuffer that is stored in
 * Pinata (IPFS). Then, the metadata (JSON) is stored
 * on Pinata as well. If these operations are
 * succesful, the NFT is minted using the HoloNFT
 * smart contract. This requires the end user having
 * MetaMask or some browser Web3 provider to pay the
 * minting fee.
 *
 * @param metadata JSON object containing NFT
 * metadata
 * @param NFT Uint8Array with the NFT
 * @return JSON object containing the transaction
 * hash and the minted NFT's address. It looks like
 * this:
 * {"tx_hash": <string>, "NFT_address": <string>}
 */
async function mintNFT(metadata, filepath) {
    // upload to Pinata
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

    let ret = {};
    let data = new FormData();
    // let myStream = es.readArray(data);
    data.append('file', new fs.ReadStream(filepath));
    // data.append('file', new fs.ReadStream(NFT));

    // first store image
    let response = await axios
        .post(url, data, {
            maxBodyLength: 'Infinity', //this is needed to prevent axios from erroring out with large files
            headers: {
                'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_API_SECRET
            }
        });
    let ipfs_hash = response.data.IpfsHash;
    ret["NFT_address"] = "https://gateway.pinata.cloud/ipfs/" + ipfs_hash;
    // now create NFT
    let nft_metadata = metadata;
    nft_metadata["image"] = "https://gateway.pinata.cloud/ipfs/" + ipfs_hash;

    // then, metadata
    const json_url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    response = await axios.post(json_url, nft_metadata, {
        headers: {
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_API_SECRET
        }
    });
    let json_cid = response.data.IpfsHash;
    ret["NFT_metadata_address"] = "https://gateway.pinata.cloud/ipfs/" + json_cid;

    const nftContract = new web3.eth.Contract(contract.abi, contractAddress)
    const nonce = await web3.eth.getTransactionCount(my_address, 'latest'); //get latest nonce

    // send the mint tx to Alchemy
    const tx = {
        'from': my_address,
        'to': contractAddress,
        'nonce': nonce,
        'gas': 5000000,
        'value': 10000000000000000,
        'data': nftContract.methods.mintNFT("https://gateway.pinata.cloud/ipfs/" + json_cid).encodeABI()
    };

    const signPromise = web3.eth.accounts.signTransaction(tx, process.env.PRIVATE_KEY)
    let signedTx = await signPromise;
    let err, tx_res = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    if (!err) {
        console.log(
            "The hash of your transaction is: ",
            tx_res["transactionHash"],
            "\nCheck Alchemy's Mempool to view the status of your transaction!"
        );
        ret["tx_hash"] = tx_res["transactionHash"];
        return ret;
    } else {
        console.log(
            "Something went wrong when submitting your transaction:",
            err
        );
        return {};
    }
}

// testing
fs.readFile('../images/locked.png', async (err, data) => {
    if (err)
        throw err;
    createHoloNFT(data, data);
    let val = await mintNFT({"foo": "bar"}, '../images/locked.png');
    console.log(val);
});
