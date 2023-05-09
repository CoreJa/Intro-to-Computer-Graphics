import{vec3, toRadian, updateCameraSpecInHTML} from "./utils.js";

/**
 * The camera object that stores its position, direction, and up vectors.
 * @typedef {Object} Camera
 * @property {Array<number>} pos - The current camera position as an array of three numbers [x, y, z].
 * @property {Array<number>} direction - The direction that the camera is pointing as an array of three numbers [x, y, z].
 * @property {Array<number>} up - The up vector of the camera as an array of three numbers [x, y, z].
 */

/** The camera object.
* @type {Camera} 
*/
var camera={
    pos: [0, 2.5, 12], 
    direction: [0, 0, -1], 
    up: [0, 1, 0],
}
//glabal variables
var pressedKeySet = new Set();
//event listeners
document.addEventListener('keydown', (event) => {pressedKeySet.add(event.code);});
document.addEventListener('keyup', (event) => {pressedKeySet.delete(event.code);});

/**
 * Handles keyboard input to control the camera's position and rotation.
 * @function
 * @param {Camera} camera - The camera object.
 */
function handleKey(camera) {
    updateCameraSpecInHTML();
    var movePace=0.04;
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
        vec3.scaleAndAdd(camera.pos, camera.pos, camera.up, -movePace);
    }
    if(pressedKeySet.has("KeyJ")){
        vec3.rotateY(camera.direction, camera.direction, [0, 0, 0], toRadian(rotatePace));
    }
    if(pressedKeySet.has("KeyL")){
        vec3.rotateY(camera.direction, camera.direction, [0, 0, 0], toRadian(-rotatePace));
    }
}

export {camera, handleKey};