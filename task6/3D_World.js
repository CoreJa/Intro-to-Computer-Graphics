/**
Creates a shader object from given source code and compiles it.
@param {WebGLRenderingContext} gl - The WebGL rendering context.
@param {number} type - The type of shader (VERTEX_SHADER or FRAGMENT_SHADER).
@param {string} source - The source code of the shader.
@returns {WebGLShader} The compiled shader object.
*/

function createShader(gl, type, source) {
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
@param {WebGLRenderingContext} gl - The WebGL rendering context.
@param {WebGLShader} vertexShader - The compiled vertex shader object.
@param {WebGLShader} fragmentShader - The compiled fragment shader object.
@returns {WebGLProgram} The linked program object.
*/
function createProgram(gl, vertexShader, fragmentShader) {
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
@returns {{
    gl: WebGLRenderingContext, 
    programInfo: {
        program: WebGLProgram,
        attribLocations: {
            vertexPosition: number, 
            vertexNormal: number, 
            vertexColor: number 
        },uniformLocations: { 
            projectionMatrix: WebGLUniformLocation,
            modelToWorldMatrix: WebGLUniformLocation,
            viewMatrix: WebGLUniformLocation,
            ambientLightColor: WebGLUniformLocation,
            diffuseLightColor: WebGLUniformLocation,
            lightDirection: WebGLUniformLocation 
        }}
}} Object containing the WebGLRenderingContext and program information.
*/
function initWebGL() {
    // Get canvas from DOM and create WebGLRenderingContext
    let canvas = document.querySelector("#c");

    /** @type {WebGLRenderingContext} */
    let gl = canvas.getContext("webgl2");

    // Create and compile vertex and fragment shaders
    let vertexShaderSrc = `#version 300 es
    // attributes
    precision highp float;

    in vec3 vertPosition;
    in vec3 vertNormal; // NEW !!!!, need for N * L
    in vec3 vertColor;
    
    uniform mat4 projMatrix;
    uniform mat4 modelToWorldMatrix;
    uniform mat4 viewMatrix;  
    
    // New!!! new uniforms for 
    // material color and ambient light
    uniform vec3 ambientLightColor;
    
    // NEW!!! Directional Light uniforms (direction and color)
    uniform vec3 lightDirection;
    uniform vec3 diffuseLightColor;
    
    // illumination color we pass to fragment shader
    out vec4 passToFragColor;
    
    void main(){
        gl_Position = projMatrix * viewMatrix *modelToWorldMatrix * vec4(vertPosition,1.0);

        // Iambient  = IambientColor * vertColor
        vec3 Ia = ambientLightColor * vertColor;
    
        // calculate Idiffuse = IdiffuseColor * vertColor * ( N* L) 
        // need unit vectors and 
        // transpose(inverse(viewMatrix * modelMatrix)). The Transpose-Inverse matrix is used to orientate normals
        mat4 normalMatrix = transpose(inverse( modelToWorldMatrix));
    
        // get normal after it was moved to world space, multiply it by the normalMatrix and normlize
        vec3 N = normalize(vec3( normalMatrix * vec4(vertNormal, 0.0)));
       
        // Now calcuate L by
        // 1. get vertex position in world space
        vec3 fragPosition = vec3(modelToWorldMatrix * vec4(vertPosition, 1.0)) ; 
    
        // 2. subtract to get vector to light from vertex position. this gives us L
        vec3 diffuseLightDirection = normalize( lightDirection - fragPosition); // get a vector from point to light source
        
    
        vec3 L = diffuseLightDirection ; 
        float lambert = max(0.0, dot(N, L));
        passToFragColor = vec4(diffuseLightColor.xyz * vertColor  * lambert + Ia, 1.0);
        
    }`;
    let fragmentShaderSrc = `#version 300 es
    precision highp float;

    in vec4 passToFragColor;
    out vec4 fragColor;
    void main(){
        fragColor = passToFragColor;
    }`;
    let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
    let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
    let program = createProgram(gl, vertexShader, fragmentShader);

    //Use a dict to record all init location info and color info, and model view matrix 
    const programInfo={
        program: program,
        attribLocations:{
            vertexPosition: gl.getAttribLocation(program, "vertPosition"),
            vertexNormal: gl.getAttribLocation(program, "vertNormal"),
            vertexColor: gl.getAttribLocation(program, "vertColor"),
        },
        uniformLocations:{
            projectionMatrix: gl.getUniformLocation(program, "projMatrix"),
            modelToWorldMatrix: gl.getUniformLocation(program, "modelToWorldMatrix"),
            viewMatrix: gl.getUniformLocation(program, "viewMatrix"),
            ambientLightColor: gl.getUniformLocation(program, "ambientLightColor"),
            diffuseLightColor: gl.getUniformLocation(program, "diffuseLightColor"),
            lightDirection: gl.getUniformLocation(program, "lightDirection"),
        },
    }
    // Set up program information and return it
    return {gl, programInfo};
}

/**
Sets the color of a given object by assigning color values to its vertices.
@param {Object} object - The object whose color will be set.
@param {number[]} color - An array of RGB color values.
*/
function colorObject(object, color) {
    var vertexColor = [];
    for (let i = 0; i < object.vertexPositions.length; i += 3) {
        vertexColor.push(color[0], color[1], color[2]);
    }
    object.vertexColor= new Float32Array(vertexColor);
}

/**
Creates and combines vertex positions, vertex normals, and indices for multiple objects, then creates and binds buffers for the data.
@param {WebGLRenderingContext} gl - The WebGL rendering context.
@param {Object} programInfo - Information about the shader program.
@returns {Object} An object containing the buffers for each object.
*/
function initBuffers(gl, programInfo){
   // Create objects (cube and torus), and combine vertex positions, vertex normals, and indices
    const oFloor=floor(10);
    const oLight=uvSphere(0.05);
    const oCube=cube(0.7);
    const oTorus=uvTorus(0.8, 0.4);
    const oSphere=uvSphere(0.1);
    const oCylinder=uvCylinder(0.9, 0.5);
    const oCone=uvCone(0.7, 2);
    const oRing= uvTorus(1.85, 1.75);

    colorObject(oFloor, [1.0, 1.0, 1.0]);
    colorObject(oLight, [10, 10, 1.0]);
    colorObject(oCube, [0.9, 0.8, 0.6]);
    colorObject(oTorus, [0.2, 1.0, 0.6]);
    colorObject(oSphere, [0.3, 0.5, 1.0]);
    colorObject(oCylinder, [0.1, 0.6, 0.9]);
    colorObject(oCone, [0.8, 0.3, 0.5]);
    colorObject(oRing, [1.0, 0.1, 1.0]);

    objects=[oFloor, oLight, oCube, oTorus, oSphere, oCylinder, oCone, oRing];
    var indices=[];
    var vertexNormals=[];
    var vertexPositions=[];
    var vertexColor=[];
    //combine vertex positions, vertex normals, and indices
    for (let i = 0; i < objects.length; i++) {
        const object=objects[i];
        indices.push(...object.indices.map(idx=>idx+vertexPositions.length/3));
        vertexNormals.push(...object.vertexNormals);
        vertexPositions.push(...object.vertexPositions);
        vertexColor.push(...object.vertexColor);
    }
    indices=new Uint16Array(indices);
    vertexNormals=new Float32Array(vertexNormals);
    vertexPositions=new Float32Array(vertexPositions);
    vertexColor=new Float32Array(vertexColor);


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
    const indicesBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return {oFloor, oLight, oCube, oTorus, oSphere, oCylinder, oCone, oRing};
}

/**
Handles keyboard input to control the camera's position and rotation.
@param {Array<number>} cameraPos - The current camera position as an array of three numbers [x, y, z].
@param {number} cameraRot - The current camera rotation in degrees.
@returns {{cameraPos: Array<number>, cameraRot: number}} - An object containing the updated camera position and rotation.
*/
function handleKey(cameraPos, cameraRot) {
    var movePace=0.05;
    var rotatePace=1;
    cameraRot=cameraRot%360;
    

    var cameraRotRadian=glMatrix.glMatrix.toRadian(cameraRot);
    if(pressedKeySet.has("ShiftLeft")||pressedKeySet.has("ShiftRight")){
        movePace=0.2;
        rotatePace=3;
    }
    if(pressedKeySet.has("KeyW")){
        cameraPos[0]-=movePace*Math.sin(cameraRotRadian);
        cameraPos[2]-=movePace*Math.cos(cameraRotRadian);
    }
    if(pressedKeySet.has("KeyS")){
        cameraPos[0]+=movePace*Math.sin(cameraRotRadian);
        cameraPos[2]+=movePace*Math.cos(cameraRotRadian);
    }
    if(pressedKeySet.has("KeyA")){
        cameraPos[0]-=movePace*Math.cos(cameraRotRadian);
        cameraPos[2]+=movePace*Math.sin(cameraRotRadian);
    }
    if(pressedKeySet.has("KeyD")){
        cameraPos[0]+=movePace*Math.cos(cameraRotRadian);
        cameraPos[2]-=movePace*Math.sin(cameraRotRadian);
    }
    if(pressedKeySet.has("KeyI")){
        cameraPos[1]+=movePace;
    }
    if(pressedKeySet.has("KeyK")){
        if(cameraPos[1]>0.11){
            cameraPos[1]-=movePace;
        }
    }
    if(pressedKeySet.has("KeyJ")){
        cameraRot+=rotatePace;
    }
    if(pressedKeySet.has("KeyL")){
        cameraRot-=rotatePace;
    }
    return {cameraPos, cameraRot};
}

/**
Initializes WebGL, sets up buffers, and uses the shader program to render a scene.
*/
function main() {
    // Initialize WebGL, set up buffers, and use the shader program
    let {gl, programInfo}=initWebGL();
    let {oFloor, oLight, oCube, oTorus, oSphere, oCylinder, oCone, oRing}=initBuffers(gl,programInfo);

    gl.useProgram(programInfo.program);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    var cameraPos = [0, 1.5, 5];
    var cameraRot = 0;
    // Set up render function
    function render(time) {

        var camera = handleKey(cameraPos, cameraRot);
        cameraPos=camera.cameraPos;
        cameraRot=camera.cameraRot;

        // Clear the canvas, set up depth testing, create projection and view matrices
        gl.clearColor(0.1, 0.1, 0.1, 1);
        gl.clearDepth(1.0); // Clear everything
        gl.enable(gl.DEPTH_TEST); // Enable depth testing
        gl.depthFunc(gl.LEQUAL); // Near things obscure far things
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);// Clear the canvas before we start drawing on it.

        coords=Array.from(document.getElementsByClassName("coord"));
        coords[0].innerHTML=cameraPos[0].toFixed(2);
        coords[1].innerHTML=cameraPos[1].toFixed(2);
        coords[2].innerHTML=cameraPos[2].toFixed(2);
        coords[3].innerHTML=cameraRot.toFixed(2);

        // set up projection Matrix and view Matrix
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, glMatrix.glMatrix.toRadian(60), gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 100.0);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

        const viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, [0, 0, 0], [0, 0, 0], [0, 1, 0]);
        mat4.rotateY(viewMatrix, viewMatrix, glMatrix.glMatrix.toRadian(-cameraRot));
        mat4.translate(viewMatrix,viewMatrix, cameraPos.map(x=>-x));
        // mat4.multiply(viewMatrix, x, viewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);

        // Set uniform values for matrices and lighting
        const lightX = parseFloat(document.getElementById('light-x').value);
        const lightY = parseFloat(document.getElementById('light-y').value);
        const lightZ = parseFloat(document.getElementById('light-z').value);
        gl.uniform3fv(programInfo.uniformLocations.ambientLightColor, [0.2, 0.2, 0.2]);
        gl.uniform3fv(programInfo.uniformLocations.diffuseLightColor, [1, 1, 1]);
        gl.uniform3fv(programInfo.uniformLocations.lightDirection, [lightX, lightY, lightZ]);

        var indices_offset=0;
        
        // set up floor's modelMatrix.
        const floorMatrix = mat4.create();
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelToWorldMatrix, false, floorMatrix);
        gl.drawElements(gl.TRIANGLES, oFloor.indices.length, gl.UNSIGNED_SHORT, indices_offset);
        indices_offset+=oFloor.indices.length*2;

        // set up light's modelMatrix, translate.
        const lightMatrix = mat4.create();
        mat4.translate(lightMatrix, lightMatrix, [lightX, lightY, lightZ]);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelToWorldMatrix, false, lightMatrix);
        gl.drawElements(gl.TRIANGLES, oLight.indices.length, gl.UNSIGNED_SHORT, indices_offset);
        indices_offset+=oLight.indices.length*2;

        // set up cube's modelMatrix, translate and rotateXY.
        const cubeModelMatrix = mat4.create();
        mat4.translate(cubeModelMatrix, cubeModelMatrix, [-0.8, 1.0, 0.0]);
        mat4.rotateX(cubeModelMatrix, cubeModelMatrix, time * 0.001);
        mat4.rotateY(cubeModelMatrix, cubeModelMatrix, time * 0.001);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelToWorldMatrix, false, cubeModelMatrix);
        gl.drawElements(gl.TRIANGLES, oCube.indices.length, gl.UNSIGNED_SHORT, indices_offset);
        indices_offset+=oCube.indices.length*2;

        // set up torus' modelMatrix, translate and rotateX.
        const torusModelMatrix = mat4.create();
        mat4.translate(torusModelMatrix, torusModelMatrix, [1.2, 1.0, 0.0]);
        // mat4.rotateX(torusModelMatrix, torusModelMatrix, time * 0.001);
        mat4.rotateY(torusModelMatrix, torusModelMatrix, time * 0.001);
        // mat4.rotateZ(torusModelMatrix, torusModelMatrix, time * 0.001);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelToWorldMatrix, false, torusModelMatrix);
        gl.drawElements(gl.TRIANGLES, oTorus.indices.length, gl.UNSIGNED_SHORT, indices_offset);
        indices_offset+=oTorus.indices.length*2;

        // set up sphere's modelMatrix, translate and rotation.
        const sphereModelMatrix =mat4.copy(mat4.create(),torusModelMatrix);
        mat4.translate(sphereModelMatrix, sphereModelMatrix, [-0.6*Math.sqrt(2), 0.0, 0.0]);
        mat4.rotate(sphereModelMatrix, sphereModelMatrix, time * 0.005, [1, 1, 0]);
        mat4.translate(sphereModelMatrix, sphereModelMatrix, [0.6*Math.sqrt(2), 0.0, 0.0]);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelToWorldMatrix, false, sphereModelMatrix);
        gl.drawElements(gl.TRIANGLES, oSphere.indices.length, gl.UNSIGNED_SHORT, indices_offset);
        indices_offset+=oSphere.indices.length*2;

        // set up cylinder's modelMatrix, translate and rotation.
        const cylinderModelMatrix = mat4.create();
        mat4.translate(cylinderModelMatrix, cylinderModelMatrix, [0.0, 3.0, -6.0]);
        mat4.translate(cylinderModelMatrix, cylinderModelMatrix, [3.0*Math.sin(0.0025*time), 1.2*Math.sin(0.005* time), 0.0]);
        mat4.rotateX(cylinderModelMatrix, cylinderModelMatrix, glMatrix.glMatrix.toRadian(135));
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelToWorldMatrix, false, cylinderModelMatrix);
        gl.drawElements(gl.TRIANGLES, oCylinder.indices.length, gl.UNSIGNED_SHORT, indices_offset);
        indices_offset+=oCylinder.indices.length*2;

        // set up cone's modelMatrix, translate and rotation.
        const coneModelMatrix = mat4.copy(mat4.create(),cylinderModelMatrix);
        mat4.translate(coneModelMatrix, coneModelMatrix, [0.0, 0.0, -1.5]);
        mat4.rotateX(coneModelMatrix, coneModelMatrix, glMatrix.glMatrix.toRadian(180));
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelToWorldMatrix, false, coneModelMatrix);
        gl.drawElements(gl.TRIANGLES, oCone.indices.length, gl.UNSIGNED_SHORT, indices_offset);
        indices_offset+=oCone.indices.length*2;

        const ringModelMatrix = mat4.copy(mat4.create(),cylinderModelMatrix);
        mat4.translate(ringModelMatrix, ringModelMatrix, [0.0, 0.0, -1.125]);
        mat4.rotateZ(ringModelMatrix, ringModelMatrix, time * 0.01);
        mat4.rotateY(ringModelMatrix, ringModelMatrix, glMatrix.glMatrix.toRadian(90));
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelToWorldMatrix, false, ringModelMatrix);
        gl.drawElements(gl.TRIANGLES, oRing.indices.length, gl.UNSIGNED_SHORT, indices_offset);
        indices_offset+=oRing.indices.length*2;

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

}

//glabal variables
var pressedKeySet = new Set();
const mat4=glMatrix.mat4;
const vec3=glMatrix.vec3;

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