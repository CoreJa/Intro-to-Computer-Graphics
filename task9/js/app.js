import {gl, programInfo} from "./webGL.js";
import {initModels} from "./model.js";
import {camera, handleKey} from "./camera.js";

const mat4=glMatrix.mat4;
const vec3=glMatrix.vec3;

async function main() {
    var models = await initModels();
    console.log("Models initialized");
    // console.log("Buffers initialized");

    gl.useProgram(programInfo.program);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.blendEquation(gl.FUNC_ADD);
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    // gl.sampleCoverage(0.5, false);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.depthRange(0.0, 1.0);



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
        const lightX = parseFloat(document.getElementById('light-x').value);
        const lightY = parseFloat(document.getElementById('light-y').value);
        const lightZ = parseFloat(document.getElementById('light-z').value);
        gl.uniform3fv(programInfo.uniformLocations.ambientLightColor, [0.5, 0.5, 0.5]);
        gl.uniform3fv(programInfo.uniformLocations.diffuseLightColor, [1, 1, 1]);
        gl.uniform3fv(programInfo.uniformLocations.lightDirection, [lightX, lightY, lightZ]);

        // Draw models
        for (const model of models) {
            model.traverseThenDraw();
        }
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}
main();