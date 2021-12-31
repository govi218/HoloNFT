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

            // "get_last_upload"?
            // var link = document.createElement('a');
            // link.href = window.URL.createObjectURL(new Blob([buffer]));
            // link.download = fileName;
            // link.click();

            let oReq = new XMLHttpRequest();
            oReq.open("POST", upload_url, true);
            oReq.setRequestHeader('Content-Type', 'application/octet-stream');
            oReq.onload = function (oEvent) {
                // Uploaded.
            };

            oReq.send(buffer_blob);
        } else {
            console.log(iv)
            console.log(key)
            console.log(data_bs === ciph_buffer)

            // try {
            let decrypted = window.crypto.subtle.decrypt(
                {
                    name: "AES-CBC",
                    iv
                },
                key,
                data_bs
            );

            decrypted.then((data) => {
                console.log(data);

                // const decryptedValue = document.querySelector(".aes-cbc .decrypted-value");
                // decryptedValue.classList.add('fade-in');
                // decryptedValue.addEventListener('animationend', () => {
                // decryptedValue.classList.remove('fade-in');
                // });
                // decryptedValue.textContent = dec.decode(decrypted);

                var link = document.createElement('a');
                link.href = window.URL.createObjectURL(new Blob([new Uint8Array(data)]));
                var fileName = "decrypted.dat";
                link.download = fileName;
                link.click();
            }).catch((err) => console.log(err));
            // } catch (err) {
                // console.log(err);
            // }
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
