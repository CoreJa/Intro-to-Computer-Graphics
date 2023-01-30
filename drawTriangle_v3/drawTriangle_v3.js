
// create vertex shader source
let vertexShaderSrc = `#version 300 es
#pragma vscode_glsllint_stage: vert
// attributes, we only have a single attribute
// i.e. vertext position
precision highp float;
in vec4 a_position;
// the colors inputs from JS
in vec4 a_colors;
//rotation delta, [sina,cosa]
uniform vec2 rotation;
// the data send from vertexshader to fragshader
out vec4 out_colors;

void main(){
    //gl_position is a special var in vertext shader
    gl_Position = vec4(a_position.x*rotation.y + a_position.y*rotation.x,
                       a_position.y*rotation.x - a_position.x*rotation.y,
                       1,1);
    //send data to frag shader
    out_colors=a_colors;
}
`;

// create fragment shaders source
let fragmentShaderSrc = `#version 300 es
#pragma vscode_glsllint_stage: frag
// set default precision
precision highp float;

in vec4 out_colors;
out vec4 outColor;

void main(){
    outColor = out_colors;
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
var btn_direction=document.querySelector("#direction");
btn_direction.onclick=changeDirection;
let direction=true;
function changeDirection() {
  direction=!direction;
}
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

  buffers=initBuffers(gl);
  
  let then=0;
  let rotation=0;
  let speedup=45;
  //render by frame repeatedly
  function render(now){
    //convert millseconds to seconds, now is 1 degree/sec
    now/=1000;
    //setting rotation speed.
    now*=speedup;
    //delta is the diff between last frame and this frame
    delta=now-then;
    //reset then
    then=now;
    //cumulation of rotation
    if (direction){
      rotation+=delta;
    }else{
      rotation-=delta;
    }
    if (rotation>360){
      rotation-=360;
    } else if (rotation<-360){
      rotation+=360
    }
    draw(gl,program,buffers,rotation);
    console.log(rotation);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
  // draw(gl,program,buffers,rotation);
}

function initBuffers(gl) {
    // create memory buffer for vertex shader and copy/transfer vertices to GPU
    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // create triangle attributes (vertices position)
    // and populate GPU buffer
    //vertices position(2D), loading more data at once so we can easily draw another triangle.
    triangleVertices = [
       -0.7, -0.7, //vertex 1
       0.7, 0.7, //vertex 2
       0.7, -0.7, //vertex 3
       -0.7, -0.7, //vertex 4
       0.7, 0.7, //vertex 5
       -0.7, 0.7, //vertex 6
     ];
    // send vertices position data to GPU
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);

    //create and bind color VBO
    let colorBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    //color data
    colors=[
      1,0,1,1, //red+blue for v1
      1,0,1,1, //red+blue for v2
      1,0,0,1, //red for v3
      0,1,1,1, //green+blue for v4
      0,1,1,1, //blue for v5
      0,0,1,1, //blue for v6
    ]
    //send data to color VBO
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    return [positionBuffer,colorBuffer];
}

function transform(rotation){
  return [Math.sin(rotation*Math.PI/180),Math.cos(rotation*Math.PI/180)]
}

function draw(gl,program,buffers,rotation) {
  // tell the GPU which program to use 
  gl.useProgram(program);
  //Bind positionBuffer again
  gl.bindBuffer(gl.ARRAY_BUFFER,buffers[0])
  // attribute location in vertexShader
  let positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
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

  //Bind colorBuffer again
  gl.bindBuffer(gl.ARRAY_BUFFER,buffers[1])
  //get location of color attr
  let colorAttributeLocation=gl.getAttribLocation(program,'a_colors')

  //enable vertex attr array
  gl.enableVertexAttribArray(colorAttributeLocation);
  //specify how to read color VBO
  gl.vertexAttribPointer(colorAttributeLocation,4,gl.FLOAT,false,0,0);

  let rotationAttributeLocation=gl.getUniformLocation(program,'rotation');
  gl.uniform2fv(rotationAttributeLocation, transform(rotation));

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