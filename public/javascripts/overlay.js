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