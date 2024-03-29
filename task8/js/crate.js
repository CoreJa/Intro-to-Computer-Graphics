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
            vertexColor: gl.getAttribLocation(program, "a_color"),
            vertexTextureCoord: gl.getAttribLocation(program, "a_texCoord"),
        },
        uniformLocations:{
            projectionMatrix: gl.getUniformLocation(program, "u_projMatrix"),
            modelMatrix: gl.getUniformLocation(program, "u_modelMatrix"),
            normalMatrix: gl.getUniformLocation(program, "u_normalMatrix"),
            viewMatrix: gl.getUniformLocation(program, "u_viewMatrix"),
            texture: gl.getUniformLocation(program, "u_texture"),
            hasTexture: gl.getUniformLocation(program, "u_hasTexture"),
            ambientLightColor: gl.getUniformLocation(program, "u_ambientLightColor"),
            diffuseLightColor: gl.getUniformLocation(program, "u_lightColor"),
            lightDirection: gl.getUniformLocation(program, "u_lightDirection"),
        },
    }
    // Set up program information and return it
    return programInfo;
}




async function loadObject(url) {
    function colorObject(object, color) {
        var vertexColor = [];
        for (let i = 0; i < object.vertexPositions.length; i += 3) {
            vertexColor.push(color[0], color[1], color[2]);
        }
        return vertexColor;
    }
    function loadTexture(tex_url) {
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

    var obj = await (await fetch(url)).json();
    var meshes = [];
    for (let index = 0; index < obj.meshes.length; index++) {
        var mesh = {
            vertexPositions: obj.meshes[index].vertices,
            vertexNormals: obj.meshes[index].normals,
            vertexTextureCoords: obj.meshes[index].texturecoords[0],
            vertexColor: [],
            indices: obj.meshes[index].faces.flat(1),
            modelMatrix: mat4.create(),
            texture: null,
            hasTexture: false,
        };
        mesh.vertexColor = colorObject(mesh, [1, 1, 1]);
        const materialsIdx = obj.meshes[index].materialindex;
        var texMaterial = obj.materials[materialsIdx].properties.find(x=>x.key === '$tex.file');

        if (texMaterial) {
            mesh.texture=loadTexture(texMaterial.value);
            mesh.hasTexture=true;
        }
        meshes.push(mesh);
    }
    return meshes;
}

async function initObjects(){
    var objects=[];
    models=[
        "crate.json",
    ]
    for (let index = 0; index < models.length; index++) {
        objects.push(...await loadObject("model/" + models[index]));
    }
    return objects;
}

/**
Creates and combines vertex positions, vertex normals, and indices for multiple objects, then creates and binds buffers for the data.
@param {Object} programInfo - Information about the shader program.
@returns {Object} An object containing the buffers for each object.
*/
function initBuffers(programInfo, objects){
    var indices=[];
    var vertexNormals=[];
    var vertexPositions=[];
    var vertexColor=[];
    var vertexTextureCoords=[];

    //combine vertex positions, vertex normals, and indices
    for (let i = 0; i < objects.length; i++) {
        const object=objects[i];
        indices.push(...object.indices.map(idx=>idx+vertexPositions.length/3));
        vertexNormals.push(...object.vertexNormals);
        vertexPositions.push(...object.vertexPositions);
        vertexColor.push(...object.vertexColor);
        vertexTextureCoords.push(...object.vertexTextureCoords);
    }
    indices=new Uint16Array(indices);
    vertexNormals=new Float32Array(vertexNormals);
    vertexPositions=new Float32Array(vertexPositions);
    vertexColor=new Float32Array(vertexColor);
    vertexTextureCoords=new Float32Array(vertexTextureCoords);

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
    const colorBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexColor, gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
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


function modelMatrixAnimation(objects, time) {
    let [oCube]=objects;

    // const lightX = parseFloat(document.getElementById('light-x').value);
    // const lightY = parseFloat(document.getElementById('light-y').value);
    // const lightZ = parseFloat(document.getElementById('light-z').value);    
    // mat4.translate(oLight.modelMatrix, mat4.create(), [lightX, lightY, lightZ]);

    mat4.translate(oCube.modelMatrix, mat4.create(), [0.0, 1.5, 0.0]);
    // mat4.rotateX(oCube.modelMatrix, oCube.modelMatrix, time * 0.001);
    mat4.rotateY(oCube.modelMatrix, oCube.modelMatrix, time * 0.001);
    // mat4.rotateZ(oCube.modelMatrix, oCube.modelMatrix, time * 0.001);

}


/**
Initializes WebGL, sets up buffers, and uses the shader program to render a scene.
*/
async function main() {
    // Initialize WebGL, set up buffers, and use the shader program
    let programInfo = await initWebGL();
    var objects = await initObjects();
    initBuffers(programInfo, objects);

    gl.useProgram(programInfo.program);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    
    var camera={
        pos: [0, 2.5, 5], 
        direction: [0, 0, -1], 
        up: [0, 1, 0],
    }


    // Set up render function
    function render(time) {
        // Clear the canvas, set up depth testing, create projection and view matrices
        gl.clearColor(0.1, 0.1, 0.1, 1);
        gl.clearDepth(1.0); // Clear everything
        gl.enable(gl.DEPTH_TEST); // Enable depth testing
        gl.depthFunc(gl.LEQUAL); // Near things obscure far things
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
        mat4.perspective(projectionMatrix, glMatrix.glMatrix.toRadian(60), gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 100.0);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

        // set up view Matrix
        const viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, camera.pos, vec3.add([], camera.pos, camera.direction), camera.up);
        gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);

        // Set uniform values for matrices and lighting
        const lightX = parseFloat(document.getElementById('light-x').value);
        const lightY = parseFloat(document.getElementById('light-y').value);
        const lightZ = parseFloat(document.getElementById('light-z').value);
        gl.uniform3fv(programInfo.uniformLocations.ambientLightColor, [0.2, 0.2, 0.2]);
        gl.uniform3fv(programInfo.uniformLocations.diffuseLightColor, [1, 1, 1]);
        gl.uniform3fv(programInfo.uniformLocations.lightDirection, [lightX, lightY, lightZ]);

        // Set model matrix for each object
        modelMatrixAnimation(objects, time);


        // Draw objects
        var indices_offset=0;
        for (let i = 0; i < objects.length; i++) {
            gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, objects[i].modelMatrix);
            gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, mat4.transpose([], mat4.invert([], objects[i].modelMatrix)));
            gl.uniform1i(programInfo.uniformLocations.hasTexture, objects[i].hasTexture);

            if(objects[i].hasTexture == true){
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, objects[i].texture);
                gl.uniform1i(programInfo.uniformLocations.texture, 0);
            }else{
                gl.bindTexture(gl.TEXTURE_2D, null);
            }
            gl.drawElements(gl.TRIANGLES, objects[i].indices.length, gl.UNSIGNED_SHORT, indices_offset);
            indices_offset+=objects[i].indices.length*2;
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