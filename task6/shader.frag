#version 300 es
precision highp float;

in vec3 v_position;
in vec3 v_normal;
in vec3 v_color;

uniform vec3 ambientLightColor;
uniform vec3 lightDirection;
uniform vec3 diffuseLightColor;

out vec4 fragColor;

void main(){
    vec3 diffuseLightDirection = normalize( lightDirection - v_position);
    float diffuseLightIntensity = max(0.0, dot(v_normal, diffuseLightDirection));

    fragColor = vec4(diffuseLightColor.rgb * diffuseLightIntensity * v_color  + ambientLightColor * v_color, 1.0);
}