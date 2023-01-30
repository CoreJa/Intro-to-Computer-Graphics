
// create vertex shader source
let vertexShaderSrc = `#version 300 es
#pragma vscode_glsllint_stage: vert
// attributes, we only have a single attribute
// i.e. vertext position
in vec4 a_position;

void main(){
    //gl_position is a special var in vertext shader
    gl_Position = a_position;
}
`;

// create fragment shaders source
let fragmentShaderSrc = `#version 300 es
#pragma vscode_glsllint_stage: frag
// set default precision
precision highp float;
out vec4 outColor;

void main(){
  // changing color to BLUE.
    outColor = vec4(0.0, 0.0, 1, 1);
}
`;

// we need a function to compile shaders
function createShader(gl, type, source){
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
function createProgram(gl, vertexShader, fragmentShader){
  let  program = gl.createProgram();
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
function initWebGL(){
  // get canvas from DOM (HTML)
  let canvas = document.querySelector("#c");

  /** @type {WebGLRenderingContext} */
  let gl = canvas.getContext('webgl2'); 

  // create a shader program
  /* compile vertex shader source
   compile fragment shader source
   create program (using vertex and shader)
  */
  let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
  let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
  let program = createProgram(gl, vertexShader, fragmentShader);

  /* get handle for input variable in vertex shader */
  // attribute location in vertexShader
  let positionAttributeLocation = gl.getAttribLocation(program, 'a_position');

  // create memory buffer for vertex shader and copy/transfer vertices to GPU
  let positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // create triangle attributes (vertices position)
  // and populate GPU buffer
  // vertices (x, y, z)
  // triangleVertices = [
  //  /* x     y    z*/
  //   -0.5, -0.5, 0.0, // vertex 1
  //    0.5,  0.5, 0.0, // vertex 2
  //    0.5, -0.5, 0.0  // vertex3
  // ];

  //vertices position(2D), loading more data at once so we can easily draw another triangle.
  triangleVertices = [
     -1, -1, //vertex 1
     1, 1, //vertex 2
     1, -1, //vertex 3
     -1, -1, //vertex 4
     1, 1, //vertex 5
     -1, 1, //vertex 6
   ];

// send vertices position data to GPU
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);


// Now we tell vertex shader how to extract/pull/interpret bytes in buffer
// now set up how to retrieve data from buffer
// 1.st enable attrib location in shader
gl.enableVertexAttribArray(positionAttributeLocation);

// specifically how to interpret bits
let size = 2; // get/read 2 components per iteration
let type = gl.FLOAT; // size in bits for each item
let normalize = false;  // do not normalize data, generally Never
let stride = 0; // used to skip over bytes when different attributes are stored in buffer (ie position, color)
let offset = 0;  // location to start reading data from in the buffer
gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

// tell the GPU which program to use 
gl.useProgram(program);

// clear canvas
gl.clear(gl.COLOR_BUFFER_BIT);

// issue draw function. GPU will start executing pipeline
//  pulling data from buffer and we populated ...  
let primitiveType = gl.TRIANGLES;
offset = 0;
let count = 3;
gl.drawArrays(primitiveType, offset, count);
// Draw another triangle using the other 3 vertices from buffer data.
gl.drawArrays(primitiveType, offset+3, count);
}
/*
* main (global) statements
*


/** @type {WebGLRenderingContext} 
let gl = canvas.getContext('webgl2');

gl.clearColor(0.5, 1.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// create a shader program
/* compile vertex shader source
   compile fragment shader source
   create program (using vertex and shader)

let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
let program = createProgram(gl, vertexShader, fragmentShader);

// attribute location in vertexShader
let positionAttributeLocation = gl.getAttribLocation(program, 'a_position');

let positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

// create triangle attributes (vertices position)
// and populate GPU buffer
// vertices
triangleVertices = [
    -0.5, -0.5, 0.0, // v1
     0.5,  0.5, 0.0, // v2
     0.5, -0.5, 0.0
  ];

// send vertices position data to GPU
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);

// tell GPU (vertexShader) how to read data from bufferData..
// create a vertex array object
let vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// now set up how to retrieve data from buffer
// 1.st enable attrib location in shader
gl.enableVertexAttribArray(positionAttributeLocation);

// specifically how to interpret bits
let size = 2; // get/read 2 components per iteration
let type = gl.FLOAT; // size in bits for each item
let normalize = false;  // do not normalize data, generally Never
let stride = 0; // used to skip over bytes when different attributes are stored in buffer (ie position, color)
let offset = 0;  // location to start reading data from in the buffer
gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.useProgram(program);

let primitiveType = gl.TRIANGLES;
offset = 0;
let count = 3;

gl.drawArrays(primitiveType, offset, count);

*/