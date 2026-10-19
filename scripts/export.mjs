import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import * as THREE from '../vendor/three.module.js';import {makeScene,setPose} from '../src/scene.mjs';import {POS} from '../src/level.mjs';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}};
const exporterSource=fs.readFileSync(path.join(dir,'vendor/GLTFExporter.js'),'utf8').replace("'three'",JSON.stringify(pathToFileURL(path.join(dir,'vendor/three.module.js')).href));
const {GLTFExporter}=await import('data:text/javascript;base64,'+Buffer.from(exporterSource).toString('base64'));
const states=[{id:'01_start',label:'01 / 安全点与旋转梯',node:'S',turn:3,camera:1,won:false},{id:'02_aligned',label:'02 / 指定视角与连接',node:'T',turn:0,camera:0,won:false},{id:'03_transfer',label:'03 / 遮挡屏后的深度过渡',node:'T',turn:0,camera:0,won:false},{id:'04_goal',label:'04 / 抵达光下的门',node:'G',turn:0,camera:0,won:true}];
const renders=[],manifest=[];
for(const state of states){const scene=makeScene({style:'classic'});setPose(scene,state);for(const m of Object.values(scene.markers))m.visible=false;if(state.id==='03_transfer')scene.player.position.copy(new THREE.Vector3(...POS.A).lerp(new THREE.Vector3(...POS.B),.5));scene.world.updateMatrixWorld(true);
const meshes=[];let triangles=0;
scene.world.traverse(o=>{if(!o.isMesh||!o.visible)return;const p=o.geometry.attributes.position,n=o.geometry.attributes.normal,normalMatrix=new THREE.Matrix3().getNormalMatrix(o.matrixWorld),positions=[],normals=[];for(let i=0;i<p.count;i++){positions.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).toArray());normals.push(new THREE.Vector3().fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize().toArray());}const indices=o.geometry.index?Array.from(o.geometry.index.array):Array.from({length:p.count},(_,i)=>i);triangles+=indices.length/3;meshes.push({name:o.name,positions,normals,indices,color:o.material.color.clone().convertLinearToSRGB().toArray()});});
renders.push({id:state.id,label:state.label,camera:state.camera===1?[-1,.65,1]:[1,.8,1],meshes});
if(state.id!=='03_transfer'){const binary=await new GLTFExporter().parseAsync(scene.world,{binary:true,onlyVisible:true});const buf=Buffer.from(binary);if(buf.readUInt32LE(8)!==buf.length)throw Error('GLB length');fs.writeFileSync(path.join(dir,'models',state.id+'.glb'),buf);manifest.push({id:state.id,file:'models/'+state.id+'.glb',bytes:buf.length,triangles,state,source:'src/scene.mjs'});}
}
fs.writeFileSync(path.join(dir,'src/render-geometry.json'),JSON.stringify(renders));fs.writeFileSync(path.join(dir,'asset-manifest.json'),JSON.stringify({version:'0.2.0',units:'metres',upAxis:'Y',assets:manifest},null,2));console.log(manifest);
