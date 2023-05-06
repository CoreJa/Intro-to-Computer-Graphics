/**
Creates a shader object from given source code and compiles it.
@param {number} type - The type of shader (VERTEX_SHADER or FRAGMENT_SHADER).
@param {string} source - The source code of the shader.
@returns {WebGLShader} The compiled shader object.
*/

function createShader(type, source) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

/**
Links vertex and fragment shaders into a program object.
@param {WebGLShader} vertexShader - The compiled vertex shader object.
@param {WebGLShader} fragmentShader - The compiled fragment shader object.
@returns {WebGLProgram} The linked program object.
*/
function createProgram(vertexShader, fragmentShader) {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}


/**
Initializes the WebGL rendering context and creates vertex and fragment shaders.
Object containing the WebGLRenderingContext and program information.
*/
async function initWebGL() {
    // Create and compile vertex and fragment shaders
    let vertexShaderSrc = await (await fetch("./glsl/shader.vert")).text();
    let fragmentShaderSrc = await (await fetch("./glsl/shader.frag")).text();
    
    let vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSrc);
    let fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);
    let program = createProgram(vertexShader, fragmentShader);

    //Use a dict to record all init location info and color info, and model view matrix 
    const programInfo={
        program: program,
        attribLocations:{
            vertexPosition: gl.getAttribLocation(program, "a_position"),
            vertexNormal: gl.getAttribLocation(program, "a_normal"),
            vertexTextureCoord: gl.getAttribLocation(program, "a_texCoord"),
        },
        uniformLocations:{
            projectionMatrix: gl.getUniformLocation(program, "u_projMatrix"),
            modelMatrix: gl.getUniformLocation(program, "u_modelMatrix"),
            normalMatrix: gl.getUniformLocation(program, "u_normalMatrix"),
            viewMatrix: gl.getUniformLocation(program, "u_viewMatrix"),
            texture: gl.getUniformLocation(program, "u_texture"),
            ambientLightColor: gl.getUniformLocation(program, "u_ambientLightColor"),
            diffuseLightColor: gl.getUniformLocation(program, "u_lightColor"),
            lightDirection: gl.getUniformLocation(program, "u_lightDirection"),
        },
    }
    // Set up program information and return it
    return programInfo;
}

class Model{
    constructor(url){
        this.url="model/"+url;
        this.name=url.split(/\./)[0];
    }
    async load(){
        this.json=await (await fetch(this.url)).json();
        this.meshes=[];
        for (const mesh of this.json.meshes){
            this.meshes.push({
                vertexPositions: mesh.vertices,
                vertexNormals: mesh.normals,
                vertexTextureCoords: mesh.texturecoords[0],
                indices: mesh.faces.flat(1),
                texture: this.loadTexture(this.name+ "/" + this.json.materials[mesh.materialindex].properties.find(x=>x.key === '$tex.file').value.split(/[\/\\]/).pop()),
                modelMatrix: mat4.create(),
            });
        }
        this.modelMatrix = mat4.create();
        this.hierarchicalTree=this.json.rootnode;
        this.animation = this.json.animations ? this.json.animations[0] : null;
    }
    loadTexture(tex_url) {
        const texture = gl.createTexture();
        const image = new Image();
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            gl.generateMipmap(gl.TEXTURE_2D);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        image.src = "texture/" + tex_url;
        return texture;
    }
    traverse(node, parentMatrix){
        var currentMatrix = mat4.mul([], parentMatrix, mat4.transpose([], node.transformation));
        // console.log(node.name);
        if (node.meshes){
            for (const meshIdx of node.meshes){
                this.meshes[meshIdx].modelMatrix=currentMatrix;
            }
        }
        if (node.children){
            for (const child of node.children){
                this.traverse(child, currentMatrix);
            }
        }
    }
}


async function initModels(){
    var models=[];
    const modelFiles=[
        // "winter.json",
        "camping.json",
        "windmill.json",
    ];
    for (const modelFile of modelFiles){
        const model = new Model(modelFile);
        await model.load();
        console.log(model);
        model.traverse(model.hierarchicalTree, mat4.create());
        console.log("traverse done");
        models.push(model);
    }
    return models;
}

function initBuffers(programInfo, models){
    var indices=[];
    var vertexNormals=[];
    var vertexPositions=[];
    var vertexTextureCoords=[];

    //combine vertex positions, vertex normals, and indices
    var vertexCount=0;
    for (const model of models) {
        for (const mesh of model.meshes){
            indices.push(mesh.indices.map(idx=>idx+vertexCount));
            vertexNormals.push(mesh.vertexNormals);
            vertexPositions.push(mesh.vertexPositions);
            vertexTextureCoords.push(mesh.vertexTextureCoords);
            vertexCount+=mesh.vertexPositions.length/3;
        }
    }
    indices=new Uint16Array(indices.flat(1));
    vertexNormals=new Float32Array(vertexNormals.flat(1));
    vertexPositions=new Float32Array(vertexPositions.flat(1));
    vertexTextureCoords=new Float32Array(vertexTextureCoords.flat(1));

    //Create and bind vertex positions buffer, vertex normals buffer, and indices buffer
    const positionBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexPositions, gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    const normalBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexNormals, gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
    const texCoordBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexTextureCoords, gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexTextureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexTextureCoord);
    const indicesBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

}

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
        if(camera.pos[1]>0.11){
            vec3.scaleAndAdd(camera.pos, camera.pos, camera.up, -movePace);
        }
    }
    if(pressedKeySet.has("KeyJ")){
        vec3.rotateY(camera.direction, camera.direction, [0, 0, 0], glMatrix.glMatrix.toRadian(rotatePace));
    }
    if(pressedKeySet.has("KeyL")){
        vec3.rotateY(camera.direction, camera.direction, [0, 0, 0], glMatrix.glMatrix.toRadian(-rotatePace));
    }
    return camera;
}


function modelMatrixAnimation(models, time) {
    // let [oCube]=models;


    // mat4.translate(oCube.modelMatrix, mat4.create(), [0.0, 1.5, 0.0]);
    // mat4.rotateX(oCube.modelMatrix, oCube.modelMatrix, time * 0.001);
    // mat4.rotateY(oCube.modelMatrix, oCube.modelMatrix, time * 0.001);
    // mat4.rotateZ(oCube.modelMatrix, oCube.modelMatrix, time * 0.001);

}


/**
Initializes WebGL, sets up buffers, and uses the shader program to render a scene.
*/
async function main() {
    // Initialize WebGL, set up buffers, and use the shader program
    let programInfo = await initWebGL();
    console.log("WebGL initialized");
    var models = await initModels();
    console.log("Models initialized");
    initBuffers(programInfo, models);
    console.log("Buffers initialized");
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


    var camera={
        pos: [0, 2.5, 10], 
        direction: [0, 0, -1], 
        up: [0, 1, 0],
    }


    // Set up render function
    function render(time) {
        // Clear the canvas, set up depth testing, create projection and view matrices
        gl.clearColor(0.1, 0.1, 0.1, 1);
        gl.clearDepth(1.0); // Clear everything
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);// Clear the canvas before we start drawing on it.

        handleKey(camera);
        coords=Array.from(document.getElementsByClassName("coord"));
        coords[0].innerHTML=camera.pos[0].toFixed(2);
        coords[1].innerHTML=camera.pos[1].toFixed(2);
        coords[2].innerHTML=camera.pos[2].toFixed(2);
        coords[3].innerHTML=camera.direction[0].toFixed(2);
        coords[4].innerHTML=camera.direction[1].toFixed(2);
        coords[5].innerHTML=camera.direction[2].toFixed(2);

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
        gl.uniform3fv(programInfo.uniformLocations.ambientLightColor, [0.3, 0.3, 0.3]);
        gl.uniform3fv(programInfo.uniformLocations.diffuseLightColor, [1, 1, 1]);
        gl.uniform3fv(programInfo.uniformLocations.lightDirection, [lightX, lightY, lightZ]);

        // Set model matrix for each models
        modelMatrixAnimation(models, time);


        // Draw models
        var indices_offset=0;
        for (const model of models) {
            for (const mesh of model.meshes) {
                const localMatrix = mat4.mul([], mesh.modelMatrix, model.modelMatrix);
                gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, localMatrix);
                gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, mat4.transpose([], mat4.invert([], localMatrix)));
    
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, mesh.texture);
                gl.uniform1i(programInfo.uniformLocations.texture, 0);
    
                gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, indices_offset);
                indices_offset+=mesh.indices.length*2;
            }

        }
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

}

//glabal variables
var pressedKeySet = new Set();
const mat4=glMatrix.mat4;
const vec3=glMatrix.vec3;
/** @type {WebGLRenderingContext} */
const gl = document.querySelector("#c").getContext("webgl2");

//event listeners
document.addEventListener('keydown', (event) => {pressedKeySet.add(event.code);});
document.addEventListener('keyup', (event) => {pressedKeySet.delete(event.code);});
text=Array.from(document.getElementsByClassName("text"));
text.forEach(t => {
    t.innerHTML=parseFloat(t.previousElementSibling.value).toFixed(2);
    t.previousElementSibling.addEventListener("input",()=>{
        t.innerHTML=parseFloat(t.previousElementSibling.value).toFixed(2);
    })
});
main();