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
uniform bool u_hasTexture;

out vec4 fragColor;

void main(){
    vec3 basicColor;
    if(u_hasTexture == true){
        basicColor = texture(u_texture, v_texCoord).rgb;
    }else{
        basicColor = v_color;
    }
    

    vec3 diffuseLightDirection = normalize(u_lightDirection - v_position);
    float diffuseLightIntensity = max(dot(v_normal, diffuseLightDirection), 0.0);

    fragColor = vec4(u_lightColor.rgb * diffuseLightIntensity * basicColor + u_ambientLightColor * basicColor, 1.0);
}