#version 300 es
precision highp float;

in vec3 v_position;
in vec3 v_normal;
in vec3 v_color;
in vec2 v_texCoord;

uniform vec3 u_ambientLightColor;
uniform vec3 u_lightColor;
uniform vec3 u_lightDirection;

uniform sampler2D u_texture;

out vec4 fragColor;

void main(){
    vec4 basicColor = texture(u_texture, v_texCoord);

    vec3 diffuseLightDirection = normalize(u_lightDirection);
    // vec3 diffuseLightDirection = normalize(u_lightDirection - v_position);
    float diffuseLightIntensity = max(dot(v_normal, diffuseLightDirection), 0.0);

    fragColor = vec4(u_lightColor.rgb, 1.0) * diffuseLightIntensity * basicColor + vec4(u_ambientLightColor, 1.0) * basicColor;
    // fragColor = basicColor;
}