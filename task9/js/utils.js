const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;
const vec2 = glMatrix.vec2;
const vec4 = glMatrix.vec4;
const quat = glMatrix.quat;
const toRadian = glMatrix.glMatrix.toRadian;

import {camera} from "./camera.js";
import {models} from "./app.js";

/** Camera Fieldset */
const text=Array.from(document.getElementsByClassName("text"));
text.forEach(t => {
    t.innerHTML=parseFloat(t.previousElementSibling.value).toFixed(2);
    t.previousElementSibling.addEventListener("input",()=>{
        t.innerHTML=parseFloat(t.previousElementSibling.value).toFixed(2);
    })
});

function updateCameraSpecInHTML(){
    var coords=Array.from(document.getElementsByClassName("coord"));
    coords[0].innerHTML=camera.pos[0].toFixed(2);
    coords[1].innerHTML=camera.pos[1].toFixed(2);
    coords[2].innerHTML=camera.pos[2].toFixed(2);
    coords[3].innerHTML=camera.direction[0].toFixed(2);
    coords[4].innerHTML=camera.direction[1].toFixed(2);
    coords[5].innerHTML=camera.direction[2].toFixed(2);
}

/** Options */
document.getElementById("animate-switch").addEventListener("change",()=>{
    if(document.getElementById("animate-switch").checked){
        for (let i = 0; i < models.length; i++) {
            models[i].distanceToAnimate=100;
        }
    }else{
        models[2].distanceToAnimate=5;
        models[3].distanceToAnimate=5;
        models[4].distanceToAnimate=7.5;
        models[5].distanceToAnimate=2.5;
    }
});


export {mat4, vec3, vec2, vec4, quat, toRadian, updateCameraSpecInHTML};