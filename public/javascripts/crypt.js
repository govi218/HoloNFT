(() => {

    /*
      Store the calculated ciphertext and IV here, so we can decrypt the message later.
    */
    let ciphertext;
    let ciph_buffer;
    let iv;

    let domain = window.location.protocol+"//" +window.location.host;
    let upload_url = domain + "/upload"

    async function ReadFile(key, enc) {
        var input = document.getElementsByTagName("input")[0];
        var output = document.getElementsByTagName("textarea")[0];

        if (input.files.length === 0) {
            output.value = 'No file selected';
            window.setTimeout(ReadFile, 1000);
            return;
        }

        data = await new Response(input.files[0]).arrayBuffer()
        var data_bs = new Uint8Array(data);
        iv = new Uint8Array([36, 232, 184, 38, 248, 44, 176, 39, 18, 13, 179, 175, 234, 40, 240, 78]);
        if (enc == true) {
            ciphertext = await window.crypto.subtle.encrypt(
                {
                    name: "AES-CBC",
                    iv
                },
                key,
                data_bs
            );

            var input = document.getElementsByTagName("input")[0];
            var output = document.getElementsByTagName("textarea")[0];

            if (input.files.length === 0) {
                output.value = 'No file selected';
                window.setTimeout(ReadFile, 1000);
                return;
            }
            console.log(ciphertext);
            let buffer = new Uint8Array(ciphertext);
            let buffer_blob = new Blob([buffer]);
            let fileName = "encrypted_msg.dat";

            let oReq = new XMLHttpRequest();
            oReq.open("POST", upload_url, true);
            oReq.setRequestHeader('Content-Type', 'application/octet-stream');
            oReq.onreadystatechange = function() {
                if (oReq.readyState == XMLHttpRequest.DONE) {
                    console.log(oReq);
                    var link = document.createElement('a');
                    link.href = window.URL.createObjectURL(new Blob([oReq.response]));
                    link.download = fileName;
                    link.click();
                }
            }
            oReq.responseType = "arraybuffer";
            oReq.send(buffer_blob);
        } else {
            // unpack encrypted data from PNG
            const PACK_SEPARATOR = "ENCRYPTED_PAYLOAD"; // FIXME: Access consts?
            var t_dec = new TextDecoder("ascii");
            let data_cs = t_dec.decode(data_bs);
            let offset = data_cs.indexOf(PACK_SEPARATOR);
            if (offset < 0){
                alert("Uploaded data is not a HoloNFT!");
                return;
            }

            console.log(data_cs.substring(offset, offset + PACK_SEPARATOR.length));
            let encoded_data = data_bs.slice(offset + PACK_SEPARATOR.length, data_bs.length - 16);

            // then decrypt data
            console.log(iv)
            console.log(key)
            console.log(encoded_data)

            let decrypted = window.crypto.subtle.decrypt(
                {
                    name: "AES-CBC",
                    iv
                },
                key,
                encoded_data
            );

            decrypted.then((data) => {
                var link = document.createElement('a');
                link.href = window.URL.createObjectURL(new Blob([new Uint8Array(data)]));
                var fileName = "decrypted.dat";
                link.download = fileName;
                link.click();
            }).catch((err) => console.log(err));
        }
    }

    /*
      Generate an encryption key, then set up event listeners
      on the "Encrypt" and "Decrypt" buttons.
    */
    window.crypto.subtle.generateKey(
        {
            name: "AES-CBC",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    ).then((key) => {
        const encryptButton = document.querySelector(".aes-cbc .encrypt-button");
        encryptButton.addEventListener("click", () => {
            ReadFile(key, true);
        });

        const decryptButton = document.querySelector(".aes-cbc .decrypt-button");
        decryptButton.addEventListener("click", () => {
            ReadFile(key, false);
        });
    });
})();
