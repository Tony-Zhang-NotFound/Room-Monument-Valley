import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {makeScene,setPose,makeCamera} from '../src/scene.mjs';
import {POS,VIEWS,SWEEP_RADIUS,route,samplePath} from '../src/level.mjs';
test('endpoint and bridge edge projection align across three viewport ratios',()=>{
 for(const [w,h]of [[1200,800],[900,1100],[600,900]])for(let pose=0;pose<3;pose++){
 const c=makeCamera(w/h,pose);for(const dz of [-.6,0,.6]){const a=new THREE.Vector3(...POS.A);a.z+=dz;const b=new THREE.Vector3(...POS.B);b.z+=dz;a.project(c);b.project(c);const d=Math.hypot((a.x-b.x)*w/2,(a.y-b.y)*h/2);assert.ok(pose===0?d<1e-8:d>10);}
 }
});
test('the character silhouette stays hidden behind the mask throughout the depth transfer',()=>{
 const s=makeScene();s.world.updateMatrixWorld(true);const dir=new THREE.Vector3(...VIEWS[0]).normalize();
 const points=[];s.player.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;const inverse=new THREE.Matrix4().copy(s.player.matrixWorld).invert();const matrix=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld);for(let i=0;i<p.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix));}});
 for(let i=0;i<=10;i++){const position=new THREE.Vector3(...POS.A).lerp(new THREE.Vector3(...POS.B),i/10);for(const p of points){const ray=new THREE.Raycaster(p.clone().add(position),dir,0,20);assert.ok(ray.intersectObject(s.mask).length>0,'unmasked vertex at transfer step '+i);}}
});
test('the full rotating module stays clear of fixed architecture through its sweep',()=>{
 const s=makeScene();const fixed=s.world.children.filter(o=>!['M01','Player','SafeNode'].includes(o.name)&&!o.name.startsWith('Target_')&&!o.name.startsWith('Endpoint_')&&o.name!=='Base');
 const boxes=fixed.map(o=>[o.name,new THREE.Box3().setFromObject(o)]);const points=[];s.rotor.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;o.updateMatrix();for(let i=0;i<p.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrix));}});
 const radius=Math.max(...points.map(p=>Math.hypot(p.x,p.z))),height=Math.max(...points.map(p=>p.y));assert.ok(radius<SWEEP_RADIUS);
 // A continuous cylindrical envelope also separates every fixed solid; not only sampled angles.
 for(const [name,b]of boxes){if(b.min.y>height||b.max.y<0)continue;const x=Math.max(b.min.x,Math.min(0,b.max.x)),z=Math.max(b.min.z,Math.min(0,b.max.z));assert.ok(Math.hypot(x,z)>SWEEP_RADIUS,'continuous envelope overlap: '+name);}
 for(let angle=0;angle<360;angle+=5){s.rotor.rotation.y=angle*Math.PI/180;s.world.updateMatrixWorld(true);s.rotor.traverse(o=>{if(!o.isMesh)return;const moving=new THREE.Box3().setFromObject(o);for(const [name,b]of boxes){const inset=b.clone();inset.min.addScalar(.005);inset.max.addScalar(-.005);assert.equal(moving.intersectsBox(inset),false,`${angle} degree overlap with ${name}`);}});}
 assert.ok(Math.hypot(POS.S[0],POS.S[2])-.3>SWEEP_RADIUS);
});
test('normal staircase path maintains foot contact or step clearance',()=>{
 for(let i=0;i<=1000;i++){const [x,y,z]=samplePath(route('S','T'),i/1000);if(x>0&&x<2){const surface=(Math.min(7,Math.floor((x-1e-7)/.25))+1)*.25;assert.ok(y>=surface-1e-6,`foot below step at ${x},${y}`);assert.ok(Math.abs(z)<1e-6);}}
});
test('animation paths start and finish at stable anchors, including reverse paths',()=>{for(const [a,b]of [['S','T'],['T','F'],['F','G'],['T','S'],['F','T'],['G','F']]){assert.deepEqual(samplePath(route(a,b),0),POS[a]);const p=samplePath(route(a,b),1);assert.ok(Math.hypot(...p.map((v,i)=>v-POS[b][i]))<1e-8);}});
