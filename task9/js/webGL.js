/**
 * Creates a shader object from given source code and compiles it.
 * @function
 * @param {number} type - The type of shader (VERTEX_SHADER or FRAGMENT_SHADER).
 * @param {string} source - The source code of the shader.
 * @returns {WebGLShader} The compiled shader object.
 */

/**@type {WebGL2RenderingContext}*/
const gl = document.querySelector("#c").getContext("webgl2");
let programInfo;

// Enable anisotropic filtering extension
const ext = gl.getExtension("EXT_texture_filter_anisotropic");
if (!ext) {
    console.error("Anisotropic filtering is not supported in your browser.");
}
/**
 * Creates and compiles a shader object.
 * @function
 * @param {number} type - The type of shader (VERTEX_SHADER or FRAGMENT_SHADER).
 * @param {string} source - The source code of the shader.
 * @returns {WebGLShader} The compiled shader object.
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
 * Links vertex and fragment shaders into a program object.
 * @function
 * @param {WebGLShader} vertexShader - The compiled vertex shader object.
 * @param {WebGLShader} fragmentShader - The compiled fragment shader object.
 * @returns {WebGLProgram} The linked program object.
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
 * Initializes the WebGL rendering context and creates vertex and fragment shaders.
 * @async
 * @function
 * @returns {Promise} - A promise resolving to an object containing the WebGLRenderingContext and program information.
 */
async function initWebGL() {
    // Create and compile vertex and fragment shaders
    let vertexShaderSrc = await (await fetch("./glsl/shader.vert")).text();
    let fragmentShaderSrc = await (await fetch("./glsl/shader.frag")).text();
    
    let vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSrc);
    let fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);
    let program = createProgram(vertexShader, fragmentShader);

    //Use a dict to record all init location info and color info, and model view matrix 
    programInfo = {
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
            ambientLightColor: gl.getUniformLocation(program, "u_ambientLightColor"),
            diffuseLightColor: gl.getUniformLocation(program, "u_lightColor"),
            lightDirection: gl.getUniformLocation(program, "u_lightDirection"),
        },
    }

    // Set up WebGL
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.useProgram(programInfo.program);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.blendEquation(gl.FUNC_ADD);
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    gl.sampleCoverage(0.5, false);
    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.depthRange(0.0, 1.0);
}

export {gl, programInfo, initWebGL, ext};