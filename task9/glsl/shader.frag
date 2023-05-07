#version 300 es
precision highp float;

in vec3 v_position;
in vec3 v_normal;
in vec4 v_color;
in vec2 v_texCoord;

uniform vec3 u_ambientLightColor;
uniform vec3 u_lightColor;
uniform vec3 u_lightDirection;

uniform sampler2D u_texture;

out vec4 fragColor;

void main(){
    vec4 finalColor = texture(u_texture, v_texCoord)+ v_color;

    vec3 diffuseLightDirection = normalize(u_lightDirection);
    // vec3 diffuseLightDirection = normalize(u_lightDirection - v_position);
    float diffuseLightIntensity = max(dot(v_normal, diffuseLightDirection), 0.0);

    fragColor = vec4(u_lightColor.rgb, 1.0) * diffuseLightIntensity * finalColor + vec4(u_ambientLightColor, 1.0) * finalColor;
    // fragColor = basicColor;
}