// we need a function to compile shaders
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

// we need a function to link shaders into a program
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
    
    uniform mat4 projMatrix;
    uniform mat4 modelToWorldMatrix;
    uniform mat4 viewMatrix;  
    
    // New!!! new uniforms for 
    // material color and ambient light
    uniform vec3 ambientLightColor;
    uniform vec3 materialColor;
    
    // NEW!!! Directional Light uniforms (direction and color)
    uniform vec3 lightDirection;
    uniform vec3 diffuseLightColor;
    
    // illumination color we pass to fragment shader
    out vec4 passToFragColor;
    
    void main(){
        gl_Position = projMatrix * viewMatrix *modelToWorldMatrix * vec4(vertPosition,1.0);

        // Iambient  = IambientColor * MaterialColor
        vec3 Ia = ambientLightColor * materialColor;
    
        // calculate Idiffuse = IdiffuseColor * MaterialColor * ( N* L) 
        // need unit vectors and 
        // transpose(inverse(viewMatrix * modelMatrix)). The Transpose-Inverse matrix is used to orientate normals
        mat4 normalMatrix = transpose(inverse( viewMatrix * modelToWorldMatrix));
    
        // get normal after it was moved to world space, multiply it by the normalMatrix and normlize
        vec3 N = normalize(vec3( normalMatrix * vec4(vertNormal, 0.0)));
       
        // Now calcuate L by
        // 1. get vertex position in world space
        vec3 fragPosition = vec3(modelToWorldMatrix * vec4(vertPosition, 1.0)) ; 
    
        // 2. subtract to get vector to light from vertex position. this gives us L
        vec3 diffuseLightDirection = normalize( lightDirection - fragPosition); // get a vector from point to light source
        
    
        vec3 L = diffuseLightDirection ; 
        float lambert = max(0.0, dot(N, L));
        passToFragColor = vec4(diffuseLightColor.xyz * materialColor  * lambert + Ia, 1.0);
        
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
        },
        uniformLocations:{
            projectionMatrix: gl.getUniformLocation(program, "projMatrix"),
            modelToWorldMatrix: gl.getUniformLocation(program, "modelToWorldMatrix"),
            viewMatrix: gl.getUniformLocation(program, "viewMatrix"),
            ambientLightColor: gl.getUniformLocation(program, "ambientLightColor"),
            materialColor: gl.getUniformLocation(program, "materialColor"),
            diffuseLightColor: gl.getUniformLocation(program, "diffuseLightColor"),
            lightDirection: gl.getUniformLocation(program, "lightDirection"),
        },
    }
    // Set up program information and return it
    return {gl, programInfo};
}

function initBuffers(gl, programInfo){
   // Create objects (cube and torus), and combine vertex positions, vertex normals, and indices
    const oCube=cube(0.7);
    const oTorus=uvTorus(0.8,0.4);
    
    //combine vertex positions, vertex normals, and indices
    const vertexPositions=new Float32Array([...oCube.vertexPositions, ...oTorus.vertexPositions])
    const vertexNormals=new Float32Array([...oCube.vertexNormals, ...oTorus.vertexNormals])
    const indices=new Uint16Array([...oCube.indices, ...oTorus.indices.map(idx=>idx+oCube.vertexPositions.length/3)])
    
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
    const indicesBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return {oCube, oTorus};
}

function main() {
    // Initialize WebGL, set up buffers, and use the shader program
    let {gl, programInfo}=initWebGL();
    let {oCube, oTorus}=initBuffers(gl,programInfo);
    gl.useProgram(programInfo.program);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const mat4=glMatrix.mat4;

    // Set up render function
    function render(time) {
        // Clear the canvas, set up depth testing, create projection and view matrices
        gl.clearColor(0.1, 0.1, 0.1, 1);
        gl.clearDepth(1.0); // Clear everything
        gl.enable(gl.DEPTH_TEST); // Enable depth testing
        gl.depthFunc(gl.LEQUAL); // Near things obscure far things
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);// Clear the canvas before we start drawing on it.

        // set up projection Matrix and view Matrix
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, glMatrix.glMatrix.toRadian(60), gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 100);
        const viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, [0, 0, 3], [0, 0, 0], [0, 1, 0]);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);

        // Set uniform values for matrices and lighting
        const lightX = parseFloat(document.getElementById('light-x').value);
        const lightY = parseFloat(document.getElementById('light-y').value);
        const lightZ = parseFloat(document.getElementById('light-z').value);
        gl.uniform3fv(programInfo.uniformLocations.ambientLightColor, [0.2, 0.2, 0.2]);
        gl.uniform3fv(programInfo.uniformLocations.materialColor, [1, 1, 1]);
        gl.uniform3fv(programInfo.uniformLocations.diffuseLightColor, [1, 1, 1]);
        gl.uniform3fv(programInfo.uniformLocations.lightDirection, [lightX, lightY, lightZ]);

        // set up cube's modelMatrix, translate and rotateXY.
        const cubeModelMatrix = mat4.create();
        mat4.translate(cubeModelMatrix, cubeModelMatrix, [-0.7, 0.0, 0.0]);
        mat4.rotateX(cubeModelMatrix, cubeModelMatrix, time * 0.001);
        mat4.rotateY(cubeModelMatrix, cubeModelMatrix, time * 0.001);
        // mat4.rotateZ(cubeModelMatrix, cubeModelMatrix, time * 0.001);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelToWorldMatrix, false, cubeModelMatrix)
        gl.drawElements(gl.TRIANGLES, oCube.indices.length, gl.UNSIGNED_SHORT, 0);

        // set up torus' modelMatrix, translate and rotateXY.
        const torusModelMatrix = mat4.create();
        mat4.translate(torusModelMatrix, torusModelMatrix, [0.7, 0.0, 0.0]);
        mat4.rotateX(torusModelMatrix, torusModelMatrix, time * 0.001);
        mat4.rotateY(torusModelMatrix, torusModelMatrix, time * 0.001);
        // mat4.rotateZ(torusModelMatrix, torusModelMatrix, time * 0.001);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelToWorldMatrix, false, torusModelMatrix)
        gl.drawElements(gl.TRIANGLES, oTorus.indices.length, gl.UNSIGNED_SHORT, oCube.indices.length*2);



        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

}
main()