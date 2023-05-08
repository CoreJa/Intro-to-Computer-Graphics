import {gl, programInfo, initWebGL} from "./webGL.js";
import {initModels} from "./model.js";
import {camera, handleKey} from "./camera.js";
import {mat4, vec3, vec2} from "./utils.js";

async function main() {
    var canvas = document.querySelector("#c");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight-145;
    // Initialize WebGL
    await initWebGL();
    console.log("Models initialized");
    var models = await initModels();
    console.log("Buffers initialized");
    
    // Set up render function
    function render(time) {
        // Clear the canvas, set up depth testing, create projection and view matrices
        gl.clearColor(0.1, 0.1, 0.1, 1);
        gl.clearDepth(1.0); // Clear everything
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);// Clear the canvas before we start drawing on it.

        handleKey(camera);

        // set up projection Matrix
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, glMatrix.glMatrix.toRadian(45), gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 1000.0);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

        // set up view Matrix
        const viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, camera.pos, vec3.add([], camera.pos, camera.direction), camera.up);
        gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);

        // Set uniform values for matrices and lighting
        const lightDirection = parseFloat(document.getElementById('light-direction').value);
        gl.uniform3fv(programInfo.uniformLocations.ambientLightColor, [0.4, 0.4, 0.4]);
        gl.uniform3fv(programInfo.uniformLocations.diffuseLightColor, [1, 1, 1]);
        var [y,z]= vec2.rotate([], [10, 0], [0, 0], glMatrix.glMatrix.toRadian(-lightDirection))

        gl.uniform3fv(programInfo.uniformLocations.lightDirection, [0,y,z]);

        // Draw models
        for (const model of models) {
            model.traverseThenDraw(time);
        }
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();
export {main};