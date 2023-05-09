import {gl, programInfo, initWebGL} from "./webGL.js";
import {Model} from "./model.js";
import {camera, handleKey} from "./camera.js";
import {mat4, vec3, vec2, quat} from "./utils.js";
/**
 * The main module for the webGL application.
 * @module app 
 */

/**An array of model files to load. 
 * @type {Array.} 
 */
var models=[];
/**
 * Initializes the models by loading them from the given files and binding their mesh buffers.
 * @async 
 */
async function initModels(){
    const modelFiles=[
        "camp.json",
        "fire.json",
        "chess.json",
        "puzzle.json",
        "ship.json",
        "cube.json",
        "windmill.json",
    ];
    for (const modelFile of modelFiles){
        const model = new Model(modelFile);
        await model.load();
        // console.log(model);
        for (const mesh of model.meshes){
            mesh.vao=model.bindMeshBuffers(mesh);
        }
        models.push(model);
    }
}
/**
 * Sets up the positioning of the models in the scene. 
 */ 
function adjustModels(){
    models[0].blocklist=new Set(...models[0].blocklist, new Set([
        "Plane.031","Plane.032","Plane.033","Plane.034","Plane.035","Plane.036",
        'Circle.002','Plane.026','Circle.021','Plane.006','PM3D_Sphere3D1.001',
    ]));
    mat4.fromRotationTranslationScale(models[0].modelMatrix, quat.fromEuler([], 0, 0, 0), [0.0, 0.0, 0.0], [0.006, 0.006, 0.006]);
    mat4.fromRotationTranslationScale(models[1].modelMatrix, quat.fromEuler([], 0, 0, 0), [-0.4, 1.6, 1.2], [0.03, 0.03, 0.03]);
    mat4.fromRotationTranslationScale(models[2].modelMatrix, quat.fromEuler([], 0, 180, 0), [-2.0, -0.15, 1.7], [0.002, 0.002, 0.002]);
    mat4.fromRotationTranslationScale(models[3].modelMatrix, quat.fromEuler([], 270, 0, 0), [-4, 2, 3], [15, 15, 15]);
    mat4.fromRotationTranslationScale(models[4].modelMatrix, quat.fromEuler([], 270, 210, 0), [7.4, -0.4, 1.5], [1.0, 1.0, 1.0]);
    models[4].modelAnimation = function(time){
        return mat4.translate([], models[4].modelMatrix, [0, 0, 3 * (1 + Math.sin(time / 1000 - Math.PI / 2))]);
    }
    mat4.fromRotationTranslationScale(models[5].modelMatrix, quat.fromEuler([],0, 0, 0), [0.8, 0, 3], [0.08, 0.08, 0.08]);
    mat4.fromRotationTranslationScale(models[6].modelMatrix, quat.fromEuler([], 0, 90, 0), [0, 0, 20], [1, 1, 1]);

    models[2].distanceToAnimate=5;
    models[3].distanceToAnimate=5;
    models[4].distanceToAnimate=7.5;
    models[5].distanceToAnimate=2.5;
}

/**
 * The main function that initializes WebGL, the models, and begins rendering the scene.
 * @async 
 */
async function main() {
    var canvas = document.querySelector("#c");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight-180;

    // Initialize WebGL
    await initWebGL();
    console.log("Models initialized");
    await initModels();
    console.log("Buffers initialized");

    // adjust Models
    adjustModels();
    
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
        gl.uniform3fv(programInfo.uniformLocations.diffuseLightColor, [1.5, 1.5, 1.3]);
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
export {main, models};