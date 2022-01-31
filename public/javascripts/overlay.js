function on() {
    document.getElementById("door_overlay").style.display = "block";
}

function off() {
    document.getElementById("door_overlay").style.display = "none";
}


function openDoor() {
    document.getElementById("door_overlay").style.display = "none";
    document.getElementById("overlay").style.display = "block";
}

function door_off() {
    document.getElementById("overlay").style.display = "none";
}

// Instance the tour
var tour = new Tour({
    smartPlacement: false, // does NOT work every time
    backdrop: true,
    steps: [{
        element: "#minting",
        placement: 'right',
        title: "Minting",
        content: "This section allows you to mint a HoloNFT."
    }, {
        element: "#carrier-upload",
        placement: 'right',
        title: "NFT Display",
        content: "The photo that is going to contain the Hologram is uploaded here. Everyone will be able to see this picture. Only PNG is currently supported (max 5MB)."
    }, {
        element: "#STL-upload",
        placement: 'right',
        title: "Hologram",
        content: "The 3D hologram packed into the NFT display pic. Only STL is currently supported (max 5MB)."
    }, {
        element: ".encrypt-button",
        placement: 'right',
        title: "Mint",
        content: "When you have uploaded the HoloNFT data, you can mint an NFT by clicking here. You will need to have Metamask enabled. Your HoloNFT and secret key will be available for download above this button."
    }, {
        element: "#viewing",
        placement: 'right',
        title: "Viewing",
        content: "This section allows you to view a previously minted HoloNFT."
    }, {
        element: "#upload-nft",
        placement: 'right',
        title: "Viewing",
        content: "You can upload your HoloNFT PNG here. After you hit the \"Build 3D\" button, you need to have your secret key handy to be able to unlock your NFT and see the hologram it contains!"
    }]
});


function startTour() {
    // Initialize the tour
    tour.init();
    // Restart from begining
    tour.restart();
    // Start the tour
    tour.start(true);
}
