#version 300 es
precision highp float;

in vec3 a_position;
in vec3 a_normal;
in vec3 a_color;

uniform mat4 u_projMatrix;
uniform mat4 u_modelMatrix;
uniform mat4 u_normalMatrix;
uniform mat4 u_viewMatrix;  

out vec3 v_position;
out vec3 v_normal;
out vec3 v_color;

void main(){
    gl_Position = u_projMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0);

    v_position = (u_modelMatrix * vec4(a_position, 1.0)).xyz;
    v_normal = normalize(u_normalMatrix * vec4(a_normal, 0.0)).xyz;
    v_color = a_color;
}