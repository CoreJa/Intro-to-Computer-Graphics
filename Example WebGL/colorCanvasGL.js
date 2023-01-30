let gl = null;
/**
 * Initialize webGL context
 * */

function colorCanvasGL() {
    const canvas = document.querySelector('canvas');
    gl = canvas.getContext('webgl2');

    if (!gl) {
        alert('Could not initialize WebGL. Upgrade Browser please...');
        return;
    }
    // simplest thing is to clear the WebGL Content Area

    // set the clear color
    gl.clearColor(0.9, 0.8, 0.7, 1.0);

    // now issue webGL clear function call
    gl.clear(gl.COLOR_BUFFER_BIT);
    console.log(canvas);
}