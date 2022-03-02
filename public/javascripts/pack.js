const fs = require('fs');
const utf8 = require('utf8');

// FIXME: Replace with actual PNG magic
const PNG_MAGIC = "PNG";

// buffer cursor
let curr_idx = 0;

let read_bytes_as_int = (curr_idx, carrier_img, len) => {
    let bytes = carrier_img.slice(curr_idx, curr_idx + len);
    let buf = Buffer.from(bytes);
    return buf.readUInt32BE(0);
};

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
function get_encrypted_payload(HoloNFT, custom_offset_str = "ENCRYPTED_PAYLOAD") {
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

    if (data_cs !== png_magic_utf8)
        throw "Carrier file needs to be a PNG!";

    // iterate through chunks of PNG file
    while (true) {
        let chunk = read_chunk(carrier_img);
        if (chunk["c_type"].toString() !== "IHDR" &&
            chunk["c_type"].toString() !== "PLTE" &&
            chunk["c_type"].toString() !== "IDAT" &&
            chunk["c_type"].toString() !== "IEND") {
            console.log("Warning: dropping non-essential or unknown chunk: " + chunk["c_type"].toString());
            continue;
        }


    }

    console.log(read_chunk(carrier_img));

}

// testing
fs.readFile('../images/locked.png', (err, data) => {
    if (err)
        throw err;
    createHoloNFT(data, data);
});
