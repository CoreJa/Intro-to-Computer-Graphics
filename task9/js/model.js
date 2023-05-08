import {mat4, vec3, quat, toRadian} from "./utils.js";
import {gl, programInfo, ext} from "./webGL.js";


class Model{
    constructor(url){
        this.url = "model/"+url;
        this.name = url.split(/\./)[0];
        this.blocklist = new Set();
        this.blockChannels = new Set();
    }
    async load(){
        this.json=await (await fetch(this.url)).json();

        this.textures=[];
        for(const material of this.json.materials){
            const textureURL = material.properties.find(x=>x.key === '$tex.file');
            this.textures.push(textureURL ? this.loadTexture(this.name+ "/" + textureURL.value.split(/[\/\\]/).pop()): null);
        }

        this.meshes=[];
        for (const mesh of this.json.meshes){
            const textureURL = this.json.materials[mesh.materialindex].properties.find(x=>x.key === '$tex.file');
            const colorKey = this.json.materials[mesh.materialindex].properties.find(x=>x.key === '$clr.diffuse');
            const color = [...colorKey?colorKey.value:[0,0,0], 1];
            this.meshes.push({
                name: mesh.name,
                vertexPositions: mesh.vertices,
                vertexNormals: mesh.normals,
                vertexTextureCoords: mesh.texturecoords[0],
                vertexColors: textureURL ? Array(mesh.vertices.length/3*4).fill(0) : Array(mesh.vertices.length/3).fill(color).flat(1),
                indices: mesh.faces.flat(1),
                texture: this.textures[mesh.materialindex],
                modelMatrix: mat4.create(),
                vao: null,
            });
        }

        this.modelMatrix = mat4.create();
        this.hierarchicalTree=this.json.rootnode;
        if (this.json.animations){
            this.animation = this.json.animations[0];
            this.animation.duration = this.animation.duration/this.animation.tickspersecond*1000;
            var channelTable = {};
            for (const channel of this.json.animations[0].channels){
                channel.positionkeys.forEach(key=>key[0]=key[0]/this.animation.tickspersecond*1000);
                channel.rotationkeys.forEach(key=>key[0]=key[0]/this.animation.tickspersecond*1000);
                channel.scalingkeys.forEach(key=>key[0]=key[0]/this.animation.tickspersecond*1000);
                channelTable[channel.name] = channel;
            }
            this.animation.channels = channelTable;
        } else {
            this.animation = null;
        }

    }
    loadTexture(tex_url) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0 ,gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 255, 0, 255]));

        const image = new Image();
        image.onload = function() {
            // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);

            // Set anisotropic filtering
            const maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, maxAnisotropy);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        image.src = "texture/" + tex_url;
        return texture;
    }

    traverseThenDraw(time){
        this.traverse(this.hierarchicalTree, this.modelMatrix, time);

    }
    traverse(node, parentMatrix, time){
        var currentMatrix = mat4.mul([], parentMatrix, mat4.transpose([], node.transformation));
        if (this.animation) {
            if(!this.blockChannels.has(node.name) && node.name in this.animation.channels){
                const timeByTick = time % this.animation.duration;
                // console.log(timeByTick, time, this.animation.duration);
                const channel = this.animation.channels[node.name];
                const position = interpolateKeys(channel.positionkeys, timeByTick);
                const rotation = interpolateKeys(channel.rotationkeys, timeByTick);
                const scaling = interpolateKeys(channel.scalingkeys, timeByTick);
                const animat = mat4.fromRotationTranslationScale([], [rotation[1], rotation[2], rotation[3], rotation[0]], position, scaling);
                currentMatrix = mat4.mul([], currentMatrix, animat);
            }
        }
        if (node.meshes){
            for (const meshIdx of node.meshes){
                this.draw(this.meshes[meshIdx], currentMatrix);
            }
        }
        if (node.children){
            for (const child of node.children){
                this.traverse(child, currentMatrix, time);
            }
        }
    }
    draw(mesh, currentMatrix){
        if (this.blocklist.has(mesh.name)) return;
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, currentMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, mat4.transpose([], mat4.invert([], currentMatrix)));
        if (mesh.texture!==null){
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, mesh.texture);
            gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
        }else{
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        gl.bindVertexArray(mesh.vao);
        gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    }

    bindMeshBuffers(mesh){    
        const vao=gl.createVertexArray();
        gl.bindVertexArray(vao);
    
        const positionBuffer=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertexPositions), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        const normalBuffer=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertexNormals), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
        const texCoordBuffer=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertexTextureCoords), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexTextureCoord);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexTextureCoord, 2, gl.FLOAT, false, 0, 0);
        const colorBuffer=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertexColors), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
        const indicesBuffer=gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);

        gl.bindVertexArray(null);
        return vao;
    }
}

function interpolateKeys(keyframes, time){
    var pre = null;
    var next = null;
    for (const keyframe of keyframes){
        if (time >= keyframe[0]){
            pre = keyframe;
        }else {
            next = keyframe;
            break;
        }
    }
    if (pre == null|| next == null) return keyframes[0][1];
    
    const t = (time - pre[0]) / (next[0] - pre[0]);
    if (keyframes[0][1].length == 3) {
        return vec3.lerp([], pre[1], next[1], t);
    } else{
        return quat.slerp([], pre[1], next[1], t);
    }
}

async function initModels(){
    var models=[];
    const modelFiles=[
        "camp.json",
        "fire.json",
        "chess.json",
        "puzzle.json",
        // "book.json",
        // "windmill.json",
    ];
    for (const modelFile of modelFiles){
        const model = new Model(modelFile);
        await model.load();
        console.log(model);
        for (const mesh of model.meshes){
            mesh.vao=model.bindMeshBuffers(mesh);
        }
        models.push(model);
    }
    
    models[0].blocklist=new Set(...models[0].blocklist, new Set(["Plane.031","Plane.032","Plane.033","Plane.034","Plane.035","Plane.036",]));
    mat4.fromRotationTranslationScale(models[0].modelMatrix, [0, 0, 0, 1], [0.0, 0.0, 0.0], [0.006, 0.006, 0.006]);
    
    mat4.fromRotationTranslationScale(models[1].modelMatrix, [0, 0, 0, 1], [-0.4, 1.6, 1.2], [0.03, 0.03, 0.03]);
    
    mat4.fromRotationTranslationScale(models[2].modelMatrix, [0, 0, 0, 1], [-2.0, -0.15, 1.7], [0.002, 0.002, 0.002]);

    // models[3].blockChannels=new Set(["Animated Camera 1"]);
    mat4.fromRotationTranslationScale(models[3].modelMatrix, quat.fromEuler([], 270, 180, 0), [0, 1.2, 5], [15, 15, 15]);

    // mat4.fromRotationTranslationScale(models[4].modelMatrix, quat.fromEuler([], 270, 180, 0), [0, 1.2, 5], [15, 15, 15]);
    // mat4.fromRotationTranslationScale(models[4].modelMatrix, [0, 0, 0, 1], [0,0,50], [0.2, 0.2, 0.2]);

    // models[4].blockChannels=new Set(["joint3"]);
    return models;
}
export {initModels};