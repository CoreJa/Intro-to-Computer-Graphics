#version 300 es
// attributes
in vec3 vertPosition;
in vec3 vertColor;
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
    
}