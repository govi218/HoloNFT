(async () => {
    /*
      Store the calculated ciphertext and IV here, so we can decrypt the message later.
    */
    let ciphertext;
    let ciph_buffer;
    let iv;

    let domain = window.location.protocol+"//" +window.location.host;
    let upload_url = domain + "/upload";
    let contract_url = domain + "/get_contract";
    let carrier_upload_url = domain + "/upload_carrier";

    const contractAddress = "0x1221F89B11e36d28595485372269d6F1fd576FBa";
    let abi;
    let get_contract = new XMLHttpRequest();
    get_contract.open("get", contract_url, true);
    get_contract.onreadystatechange = function() {
        if (get_contract.readyState == XMLHttpRequest.DONE) {
            let contract = JSON.parse(get_contract.response);
            console.log(contract);

            if (contract["abi"] === undefined)
                alert("HoloNFT contract invalid!");
            abi = contract["abi"];
        }
    }
    get_contract.send();

    await new Promise(r => setTimeout(r, 100));

    console.log(abi);

    async function encrypt(key, data_bs) {
        var carrier_input = document.getElementById("carrier-upload");
        if(carrier_input.files.length === 0) {
            return;
        }
        let carrier_buf = await new Response(carrier_input.files[0]).arrayBuffer();
        iv = window.crypto.getRandomValues(new Uint8Array(16));

        let account = await connectWalletHandler();
        console.log("account address: ", account);

        const result = crypto.subtle.exportKey('raw', key);
        result.then((key_data) => {
            var link = document.getElementById('key_download_btn');
            link.href = window.URL.createObjectURL(new Blob([new Uint8Array(key_data)]));
            var fileName = "secret.key";
            link.download = fileName;
        }).catch((err) => console.log(err));

        ciphertext = await window.crypto.subtle.encrypt(
            {
                name: "AES-CBC",
                iv
            },
            key,
            data_bs
        );

        // add IV bytes to ciphertext
        let buffer = new Uint8Array(ciphertext);
        var iv_buf = new Uint8Array(buffer.length + iv.length);
        iv_buf.set(buffer);
        iv_buf.set(iv, buffer.length);

        let buffer_blob = new Blob([iv_buf]);
        let carrier_buffer_blob = new Blob([carrier_buf]);
        let fileName = "HoloNFT.png";

        let oReq = new XMLHttpRequest();
        oReq.open("POST", carrier_upload_url, true);
        oReq.setRequestHeader('Content-Type', 'application/octet-stream');
        oReq.onreadystatechange = function() {
            if (oReq.readyState == XMLHttpRequest.DONE) {
                let oReq2 = new XMLHttpRequest();
                oReq2.open("POST", upload_url, true);
                oReq2.setRequestHeader('Content-Type', 'application/octet-stream');
                oReq2.onreadystatechange = function() {
                    if (oReq2.readyState == XMLHttpRequest.DONE) {
                        console.log(oReq2.getResponseHeader("metadataurl"));

                        mintNFTHandler(oReq2.getResponseHeader("metadataurl"), oReq2.response)
                    }
                }
                oReq2.responseType = "arraybuffer";
                oReq2.send(buffer_blob);
            }
        }
        oReq.send(carrier_buffer_blob);
    }

    async function decrypt(key, data_bs) {
        // unpack encrypted data from PNG
        const PACK_SEPARATOR = "ENCRYPTED_PAYLOAD"; // FIXME: Access consts?
        var t_dec = new TextDecoder("ascii");
        let data_cs = t_dec.decode(data_bs);
        let offset = data_cs.indexOf(PACK_SEPARATOR);
        console.log(offset);
        if (offset < 0){
            alert("Uploaded data is not a HoloNFT!");
            return;
        }

        console.log(data_cs.substring(offset, offset + PACK_SEPARATOR.length));
        let encoded_data = data_bs.slice(offset + PACK_SEPARATOR.length, data_bs.length - 16);

        // get IV bytes from ciphertext
        let iv = encoded_data.slice(encoded_data.length - 16, encoded_data.length);
        encoded_data = encoded_data.slice(0, encoded_data.length - 16);

        // then decrypt data
        let decrypted = window.crypto.subtle.decrypt(
            {
                name: "AES-CBC",
                iv
            },
            key,
            encoded_data
        );

        decrypted.then((data) => {
            // var link = document.createElement('a');
            let stlBlob = new Blob([new Uint8Array(data)]);
            // link.href = window.URL.createObjectURL(stlBlob);
            // var fileName = "decrypted.stl";
            // link.download = fileName;
            // link.click();
            STLViewer(stlBlob, "model")
        }).catch((err) => console.log(err));
    }

    async function ReadFile(key, enc) {
        if (enc == true) {
            var stl_input = document.getElementById("STL-upload");
            data = await new Response(stl_input.files[0]).arrayBuffer();
            var data_bs = new Uint8Array(data);
            encrypt(key, data_bs);
        } else {
            var nft_input = document.getElementById("upload-nft");
            data = await new Response(nft_input.files[0]).arrayBuffer();
            var data_bs = new Uint8Array(data);
            var key_input = document.getElementById("upload-key");
            if (key_input.files.length === 0) {
                window.setTimeout(ReadFile, 1000);
                return;
            }

            key_data = await new Response(key_input.files[0]).arrayBuffer()
            let imported_key_promise = window.crypto.subtle.importKey(
                "raw",
                key_data,
                "AES-CBC",
                true,
                ["encrypt", "decrypt"]
            );
            imported_key_promise.then((imported_key) => decrypt(imported_key, data_bs));
        }
    }

    const connectWalletHandler = async () => {
        const { ethereum } = window;
        if(!ethereum) {
            alert("Please install Metamask!");
        }
        let accounts;
        try {
            accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            console.log(accounts);
        } catch (err) {
            console.log(err);
        }

        if (accounts === undefined)
            alert("Metamask account link failed!");

        return accounts[0];
    }

    const mintNFTHandler = async (metadataUrl, holoNFTBytes) => {
        try {
            const { ethereum } = window;
            if (ethereum) {
                console.log(ethers.providers);
                const providers = new ethers.providers.Web3Provider(ethereum);
                const signer = providers.getSigner();
                const nftContract = new ethers.Contract(contractAddress, abi, signer);

                console.log("initialize payment");

                let tx = await nftContract.mintNFT(metadataUrl, { value: ethers.utils.parseEther("0.01") });
                console.log("Mining...");
                await tx.wait();

                console.log(`Mined, hash: https://rinkeby.etherscan.io/tx/${tx.hash}`);
                let link = document.getElementById('nft_download_btn');
                link.href = window.URL.createObjectURL(new Blob([holoNFTBytes]));
                link.download = "HoloNFT.png";

                let download_div = document.getElementById("downloads");
                download_div.style = "visibility: visible;"
            } else {
                alert("Ethereum object not found (check metamask)");
            }
        } catch(err) {
            alert(err);
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
        const encryptButton = document.querySelector(".encrypt-button");
        encryptButton.addEventListener("click", () => {
            ReadFile(key, true);
        });
    });
    const decryptButton = document.querySelector(".decrypt-button");
    decryptButton.addEventListener("click", () => {
        ReadFile("", false);
    });
})();
