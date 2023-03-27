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

/* main function that execute steps to 
   render a single triangle on the canvas
*/



function initWebGL() {
    // get canvas from DOM (HTML)
    let canvas = document.querySelector("#c");

    /** @type {WebGLRenderingContext} */
    let gl = canvas.getContext("webgl2");

    // create a shader program
    /* compile vertex shader source
   compile fragment shader source
   create program (using vertex and shader)
  */
    // create vertex shader source
    let vertexShaderSrc = `#version 300 es
    #pragma vscode_glsllint_stage: vert
    // attributes, we only have a single attribute
    // i.e. vertext position
    
    precision highp float;
    in vec4 aVertexPosition; // the colors inputs from JS
    in vec4 aVertexColor; //the translated pos
    uniform mat4 uModelViewMatrix; 
    uniform mat4 uProjectionMatrix;

    out vec4 out_colors;

    void main(){
        //gl_position is a special var in vertext shader
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        out_colors = aVertexColor;
    }
    `;

    // create fragment shaders source
    let fragmentShaderSrc = `#version 300 es
    #pragma vscode_glsllint_stage: frag
    // set default precision
    precision highp float;

    in vec4 out_colors;
    out vec4 fragColor;
    void main(){
        fragColor = out_colors;
    }
    `;
    let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
    let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
    let program = createProgram(gl, vertexShader, fragmentShader);

    //Use a dict to record all init location info and color info, and model view matrix 
    const programInfo={
        program: program,
        attribLocations:{
            vertexPosition: gl.getAttribLocation(program, "aVertexPosition"),
            vertexColor: gl.getAttribLocation(program, "aVertexColor"),
        },
        uniformLocations:{
            projectionMatrix: gl.getUniformLocation(program, "uProjectionMatrix"),
            modelViewMatrix: gl.getUniformLocation(program, "uModelViewMatrix"),
        },
    }
    return {gl, programInfo};
}

/**
 * 
 * @param {WebGLRenderingContext} gl 
 * @returns 
 */
function initBuffers(gl, programInfo) {
    var colors=[
        [1,0,0,1], //Red
        [0,1,0,1], //Green
        [0,0,1,1], //Blue
        [1,1,0,1], //Red+Green
        [1,0,1,1], //Red+Blue
        [0,1,1,1], //Green+Blue
    ]
    var vertices = [
        // Front face
        [-1,-1,1],
        [1,-1,1],
        [1,1,1],
        [-1,1,1],
        //Back face
        [-1,-1,-1],
        [-1,1,-1],
        [1,1,-1],
        [1,-1,-1],
        //Top face
        [-1,1,-1],
        [-1,1,1],
        [1,1,1],
        [1,1,-1],
        //Bottom face
        [-1,-1,-1],
        [1,-1,-1],
        [1,-1,1],
        [-1,-1,1],
        //Right face
        [1,-1,-1],
        [1,1,-1],
        [1,1,1],
        [1,-1,1],
        //Left face
        [-1,-1,-1],
        [-1,-1,1],
        [-1,1,1],
        [-1,1,-1],
    ];

    var vertexIndices = [
        0,  1,  2,      0,  2,  3,    // front
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23    // left
    ];

    let data=[];
    let indicesData=[];
    const len=24;
    let idx=0;
    for (var cube=0;cube<6;cube++){
        for (var i=0;i<6;i++) {
            var color=colors[i];
            for (var j=0;j<4;j++){
                var vertex=vertices[i*4+j];
                data=data.concat(vertex,color);
            }
        }
        indicesData=indicesData.concat(vertexIndices.map(a=>a+idx));
        idx+=len;
    }
    // console.log(indicesData);
    // console.log(data);
    // create memory buffer for vertex shader and copy/transfer vertices to GPU
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // console.log(buffer);
    // create triangle attributes (vertices position)
    // and populate GPU buffer
    //vertices position(2D), loading more data at once so we can easily draw another triangle.
    // send data to GPU
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    // console.log(data);


    let indicesBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indicesData), gl.STATIC_DRAW);

    //enable vertex attr array
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    // specifically how to interpret bits
    let size = 3; // get/read 2 components per iteration
    let type = gl.FLOAT; // size in bits for each item
    let normalize = false; // do not normalize data, generally Never
    let stride = 28; // used to skip over bytes when different attributes are stored in buffer (ie position, color)
    let offset = 0; // location to start reading data from in the buffer
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, size, type, normalize, stride, offset);

    //enable vertex attr array
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
    //specify how to read VBO
    gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, type, normalize, stride, offset+size*4);
    
    return buffer;
}

function initBody(id) {    
    return {
        id:id,
        modelViewMatrix:mat4.create(),
        inheritedMatrix:mat4.create(),
    }
}

function main(){
    let {gl, programInfo}=initWebGL();
    const buffer = initBuffers(gl, programInfo);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);

    const fieldOfView = glMatrix.glMatrix.toRadian(45); // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;

    // console.log(gl,programInfo);
    gl.clearColor(0.9, 0.9, 0.9, 1);
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    // console.log(rotation);
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // tell the GPU which program to use
    gl.useProgram(programInfo.program);

    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);


    function render() {
        gl.clearColor(0.9, 0.9, 0.9, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        bodies=[];
        for(var i=0;i<6;i++){
            bodies.push(initBody(i));
        }
        const torseRotationX=document.querySelector("#torseRotationX");
        const torseRotationY=document.querySelector("#torseRotationY");
        const torseRotationZ=document.querySelector("#torseRotationZ");

        const torseTranslationX=document.querySelector("#torseTranslationX");
        const torseTranslationY=document.querySelector("#torseTranslationY");
        const torseTranslationZ=document.querySelector("#torseTranslationZ");

        const headRotationX=document.querySelector("#headRotationX");
        const headRotationY=document.querySelector("#headRotationY");
        const headRotationZ=document.querySelector("#headRotationZ");

        const leftArm1RotationX=document.querySelector("#leftArm1RotationX");
        const leftArm1RotationY=document.querySelector("#leftArm1RotationY");
        const leftArm1RotationZ=document.querySelector("#leftArm1RotationZ");

        const leftArm2RotationX=document.querySelector("#leftArm2RotationX");
        const leftArm2RotationY=document.querySelector("#leftArm2RotationY");
        const leftArm2RotationZ=document.querySelector("#leftArm2RotationZ");

        const rightArm1RotationX=document.querySelector("#rightArm1RotationX");
        const rightArm1RotationY=document.querySelector("#rightArm1RotationY");
        const rightArm1RotationZ=document.querySelector("#rightArm1RotationZ");

        const rightArm2RotationX=document.querySelector("#rightArm2RotationX");
        const rightArm2RotationY=document.querySelector("#rightArm2RotationY");
        const rightArm2RotationZ=document.querySelector("#rightArm2RotationZ");


        //torse
        body=bodies[0];
        mat4.translate(body.modelViewMatrix, body.modelViewMatrix,[0,-0.15,-4]);
        mat4.translate(body.modelViewMatrix,body.modelViewMatrix,[parseFloat(torseTranslationX.value),parseFloat(torseTranslationY.value),parseFloat(torseTranslationZ.value)])
        mat4.rotateX(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(torseRotationX.value)));
        mat4.rotateY(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(torseRotationY.value)));
        mat4.rotateZ(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(torseRotationZ.value)));
        body.inheritedMatrix=mat4.clone(body.modelViewMatrix);
        mat4.scale(body.modelViewMatrix,body.modelViewMatrix,[0.45,0.6,0.15])
        draw(gl,programInfo, body.modelViewMatrix, body.id);

        // head
        body=bodies[1];
        mat4.translate(body.modelViewMatrix,bodies[0].inheritedMatrix,[0,0.6,0]);
        mat4.rotateX(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(headRotationX.value)));
        mat4.rotateY(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(headRotationY.value)));
        mat4.rotateZ(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(headRotationZ.value)));
        mat4.translate(body.modelViewMatrix,body.modelViewMatrix,[0,0.2,0]);
        mat4.scale(body.modelViewMatrix,body.modelViewMatrix,[0.2,0.2,0.15]);
        draw(gl,programInfo, body.modelViewMatrix, body.id);
        
        //left arm 1
        body=bodies[2];
        mat4.translate(body.modelViewMatrix,bodies[0].inheritedMatrix,[-0.45,0.2,0]);
        mat4.rotateX(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(leftArm1RotationX.value)));
        mat4.rotateY(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(leftArm1RotationY.value)));
        mat4.rotateZ(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(leftArm1RotationZ.value)));
        mat4.translate(body.modelViewMatrix,body.modelViewMatrix,[-0.3,0,0]);
        body.inheritedMatrix=mat4.clone(body.modelViewMatrix);
        mat4.scale(body.modelViewMatrix,body.modelViewMatrix,[0.3,0.1,0.1]);
        draw(gl,programInfo, body.modelViewMatrix, body.id);

        //left arm 2
        body=bodies[3];
        mat4.translate(body.modelViewMatrix,bodies[2].inheritedMatrix,[-0.3,0,0]);
        mat4.rotateX(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(leftArm2RotationX.value)));
        mat4.rotateY(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(leftArm2RotationY.value)));
        mat4.rotateZ(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(leftArm2RotationZ.value)));
        mat4.translate(body.modelViewMatrix,body.modelViewMatrix,[-0.3,0,0]);
        mat4.scale(body.modelViewMatrix,body.modelViewMatrix,[0.3,0.08,0.08]);
        draw(gl,programInfo, body.modelViewMatrix, body.id);

        //right arm 1
        body=bodies[4];
        mat4.translate(body.modelViewMatrix,bodies[0].inheritedMatrix,[0.45,0.2,0]);
        mat4.rotateX(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(rightArm1RotationX.value)));
        mat4.rotateY(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(rightArm1RotationY.value)));
        mat4.rotateZ(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(rightArm1RotationZ.value)));
        mat4.translate(body.modelViewMatrix,body.modelViewMatrix,[0.3,0,0]);
        body.inheritedMatrix=mat4.clone(body.modelViewMatrix);
        mat4.scale(body.modelViewMatrix,body.modelViewMatrix,[0.3,0.1,0.1]);
        draw(gl,programInfo, body.modelViewMatrix, body.id);

        //right arm 2
        body=bodies[3];
        mat4.translate(body.modelViewMatrix,bodies[4].inheritedMatrix,[0.3,0,0]);
        mat4.rotateX(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(rightArm2RotationX.value)));
        mat4.rotateY(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(rightArm2RotationY.value)));
        mat4.rotateZ(body.modelViewMatrix, body.modelViewMatrix, glMatrix.glMatrix.toRadian(parseFloat(rightArm2RotationZ.value)));
        mat4.translate(body.modelViewMatrix,body.modelViewMatrix,[0.3,0,0]);
        mat4.scale(body.modelViewMatrix,body.modelViewMatrix,[0.3,0.08,0.08]);
        draw(gl,programInfo, body.modelViewMatrix, body.id);

        // requestAnimationFrame(render);
    }
    // requestAnimationFrame(render);
    render();

    text=Array.from(document.getElementsByClassName("text"));
    text.forEach(t => {
        t.innerHTML=t.previousElementSibling.value;
        t.previousElementSibling.addEventListener("input",()=>{
            t.innerHTML=t.previousElementSibling.value;
            render();
        })
    });
}

/**
 * 
 * @param {WebGLRenderingContext} gl 
 * @param {Object} programInfo 
 */
function draw(gl, programInfo, modelViewMatrix, i) {
    // Set the shader uniforms
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    gl.drawElements(gl.TRIANGLES,36,gl.UNSIGNED_SHORT,i*2*36);
}


let mat4=glMatrix.mat4;
main();