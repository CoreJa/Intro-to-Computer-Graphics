import{vec3, toRadian} from "./utils.js";
var camera={
    pos: [0, 2.5, 12], 
    direction: [0, 0, 1], 
    up: [0, 1, 0],
}
//glabal variables
var pressedKeySet = new Set();
//event listeners
document.addEventListener('keydown', (event) => {pressedKeySet.add(event.code);});
document.addEventListener('keyup', (event) => {pressedKeySet.delete(event.code);});

/**
Handles keyboard input to control the camera's position and rotation.
@param {Array<number>} camera.pos - The current camera position as an array of three numbers [x, y, z].
@param {number} cameraRot - The current camera rotation in degrees.
@returns {{camera.pos: Array<number>, cameraRot: number}} - An object containing the updated camera position and rotation.
*/
function handleKey(camera) {
    var movePace=0.05;
    var rotatePace=1;
    if(pressedKeySet.has("ShiftLeft")||pressedKeySet.has("ShiftRight")){
        movePace=0.2;
        rotatePace=3;
    }
    if(pressedKeySet.has("KeyW")){
        vec3.scaleAndAdd(camera.pos, camera.pos, camera.direction, movePace);
    }
    if(pressedKeySet.has("KeyS")){
        vec3.scaleAndAdd(camera.pos, camera.pos, camera.direction, -movePace);
    }
    if(pressedKeySet.has("KeyA")){
        vec3.scaleAndAdd(camera.pos, camera.pos, vec3.cross([], camera.direction, camera.up), -movePace);
    }
    if(pressedKeySet.has("KeyD")){
        vec3.scaleAndAdd(camera.pos, camera.pos, vec3.cross([], camera.direction, camera.up), movePace);
    }
    if(pressedKeySet.has("KeyI")){
        vec3.scaleAndAdd(camera.pos, camera.pos, camera.up, movePace);
    }
    if(pressedKeySet.has("KeyK")){
        // if(camera.pos[1]>0.11){
            vec3.scaleAndAdd(camera.pos, camera.pos, camera.up, -movePace);
        // }
    }
    if(pressedKeySet.has("KeyJ")){
        vec3.rotateY(camera.direction, camera.direction, [0, 0, 0], toRadian(rotatePace));
    }
    if(pressedKeySet.has("KeyL")){
        vec3.rotateY(camera.direction, camera.direction, [0, 0, 0], toRadian(-rotatePace));
    }
    var coords=Array.from(document.getElementsByClassName("coord"));
    coords[0].innerHTML=camera.pos[0].toFixed(2);
    coords[1].innerHTML=camera.pos[1].toFixed(2);
    coords[2].innerHTML=camera.pos[2].toFixed(2);
    coords[3].innerHTML=camera.direction[0].toFixed(2);
    coords[4].innerHTML=camera.direction[1].toFixed(2);
    coords[5].innerHTML=camera.direction[2].toFixed(2);
}
const text=Array.from(document.getElementsByClassName("text"));
text.forEach(t => {
    t.innerHTML=parseFloat(t.previousElementSibling.value).toFixed(2);
    t.previousElementSibling.addEventListener("input",()=>{
        t.innerHTML=parseFloat(t.previousElementSibling.value).toFixed(2);
    })
});
export {camera, handleKey};