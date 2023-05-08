const mat4 = glMatrix.mat4;
import {gl, programInfo} from "./webGL.js";


class Model{
    constructor(url){
        this.url="model/"+url;
        this.name=url.split(/\./)[0];
        this.blocklist=new Set();
    }
    async load(){
        this.json=await (await fetch(this.url)).json();
        this.meshes=[];
        for (const mesh of this.json.meshes){
            const textureURL = this.json.materials[mesh.materialindex].properties.find(x=>x.key === '$tex.file');
            const colorKey = this.json.materials[mesh.materialindex].properties.find(x=>x.key === '$clr.diffuse');
            const color = [...colorKey?colorKey.value:[0,0,0], 1];
            const vertexColors = textureURL ? Array(mesh.vertices.length/3*4).fill(0) : Array(mesh.vertices.length/3).fill(color).flat(1);

            this.meshes.push({
                name: mesh.name,
                texture: textureURL ? this.loadTexture(this.name+ "/" + textureURL.value.split(/[\/\\]/).pop()): null,
                modelMatrix: mat4.create(),
                vao: this.bindMeshBuffers(mesh, vertexColors),
                indicesLength: mesh.faces.length * 3,
            });
        }
        this.modelMatrix = mat4.create();
        this.hierarchicalTree=this.json.rootnode;
        this.animation = this.json.animations ? this.json.animations[0] : null;
    }
    loadTexture(tex_url) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0 ,gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

        const image = new Image();
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            gl.generateMipmap(gl.TEXTURE_2D);
            // gl.bindTexture(gl.TEXTURE_2D, null);
        }
        image.src = "texture/" + tex_url;
        return texture;
    }

    traverseThenDraw(){
        this.traverse(this.hierarchicalTree, this.modelMatrix);

    }
    traverse(node, parentMatrix){
        var currentMatrix = mat4.mul([], parentMatrix, mat4.transpose([], node.transformation));
        // console.log(node.name);
        if (node.meshes){
            for (const meshIdx of node.meshes){
                // this.meshes[meshIdx].modelMatrix=currentMatrix;
                this.draw(this.meshes[meshIdx], currentMatrix);
            }
        }
        if (node.children){
            for (const child of node.children){
                this.traverse(child, currentMatrix);
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
        // gl.bindVertexArray(mesh.vao);
        // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.buffers.indicesBuffer);
        gl.bindVertexArray(mesh.vao);
        gl.drawElements(gl.TRIANGLES, mesh.indicesLength, gl.UNSIGNED_SHORT, 0);
    }

    bindMeshBuffers(mesh, vertexColors){    
        const vao=gl.createVertexArray();
        gl.bindVertexArray(vao);
    
        const positionBuffer=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        const normalBuffer=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
        const texCoordBuffer=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.texturecoords[0]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexTextureCoord);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexTextureCoord, 2, gl.FLOAT, false, 0, 0);
        const colorBuffer=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColors), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
        const indicesBuffer=gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.faces.flat(1)), gl.STATIC_DRAW);

        // gl.bindVertexArray(null);
        return vao;
        // return {positionBuffer, normalBuffer, texCoordBuffer, colorBuffer, indicesBuffer};
    }
}



async function initModels(){
    var models=[];
    const modelFiles=[
        "camp.json",
        "fire.json",
        // "puzzle.json",
        // "chess.json",
        // "windmill.json",
    ];
    for (const modelFile of modelFiles){
        const model = new Model(modelFile);
        await model.load();
        console.log(model);
        models.push(model);
    }

    models[0].modelMatrix=mat4.scale([], models[0].modelMatrix, [0.002, 0.002, 0.002]);
    models[0].blocklist=new Set(...models[0].blocklist, new Set(["Plane.031","Plane.032","Plane.033","Plane.034","Plane.035","Plane.036","Cube"]));

    mat4.translate(models[1].modelMatrix, models[1].modelMatrix, [-0.15, 0.4, 0.35]);
    mat4.scale(models[1].modelMatrix, models[1].modelMatrix, [0.015, 0.015, 0.015]);

    return models;
}
export {Model, initModels};