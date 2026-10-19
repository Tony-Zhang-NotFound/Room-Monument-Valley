import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {makeScene} from '../src/scene.mjs';
import {POS,route,samplePath} from '../src/level.mjs';
import {ARLES_PRESENTATION} from '../src/quiet-arles.mjs';

test('Arles furniture is grounded, outside travel clearance and separate from loft supports',()=>{
 const s=makeScene();s.world.updateMatrixWorld(true);
 assert.ok(Math.abs(new THREE.Box3().setFromObject(s.world.getObjectByName('Base')).min.y-ARLES_PRESENTATION.groundY)<1e-5,'plinth floats above background ground');
 const furniture=['ArlesBed','ArlesTable','ArlesChair'].map(n=>[n,new THREE.Box3().setFromObject(s.world.getObjectByName(n))]);
 for(const [name,b]of furniture){assert.ok(Math.abs(b.min.y)<1e-5,name+' floats above the floor');assert.ok(b.max.y>1,name+' is missing its upper structure');}
 for(const [from,to]of [['S','T'],['T','F'],['F','G']])for(let i=0;i<=200;i++){
  const p=new THREE.Vector3(...samplePath(route(from,to),i/200));const body=new THREE.Box3(p.clone().add(new THREE.Vector3(-.19,.02,-.19)),p.clone().add(new THREE.Vector3(.19,1.3,.19)));
  for(const [name,b]of furniture)assert.equal(body.intersectsBox(b),false,`${from}${to} obstructed by ${name}`);
 }
 const bed=furniture[0][1];for(const name of ['FarPlatform','FarSupport','FarSupportRear']){const support=new THREE.Box3().setFromObject(s.world.getObjectByName(name));assert.equal(bed.intersectsBox(support),false,'bed penetrates '+name);}
 const parts=s.assets.find(a=>a.name==='ArlesBed').constructionParts;for(const name of ['Headboard','Footboard','BedFoot','Mattress','RedQuilt','SoftPillow'])assert.ok(parts.includes(name));
 s.dispose();
});

test('static art is rendered once and its source nodes cannot become input blockers',()=>{
 const s=makeScene(),ray=new THREE.Raycaster();for(const asset of s.assets.filter(a=>!a.pickable&&a.layer!=='Gameplay')){
  s.world.getObjectByName(asset.name).traverse(o=>{if(o.isMesh){assert.equal(ray.layers.test(o.layers),false,asset.name+' intercepts picking');assert.equal(o.visible,false,'duplicate visible source '+asset.name);}});
 }
 const batch=s.world.getObjectByName('StaticArtBatch');assert.equal(batch.visible,true);assert.equal(batch.layers.isEnabled(1),true);assert.ok(s.batching.renderMeshes<s.batching.sourceMeshes);
 const sourceTriangles=s.assets.filter(a=>a.layer!=='Gameplay').reduce((sum,a)=>{s.world.getObjectByName(a.name).traverse(o=>{if(o.isMesh)sum+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});return sum;},0);
 const batchTriangles=batch.children.reduce((n,o)=>n+o.geometry.attributes.position.count/3,0);assert.equal(batchTriangles,sourceTriangles,'batch lost or duplicated geometry');
 s.rotor.traverse(o=>{if(o.isMesh)assert.equal(ray.layers.test(o.layers),true);});assert.equal(ray.layers.test(s.mask.layers),true);
 s.dispose();
});

test('winning door materials do not share emissive state with furniture or markers',()=>{
 const s=makeScene(),doorMaterials=new Set(),bedMaterials=new Set();s.door.traverse(o=>{if(o.isMesh)doorMaterials.add(o.material);});s.world.getObjectByName('ArlesBed').traverse(o=>{if(o.isMesh)bedMaterials.add(o.material);});
 for(const material of doorMaterials){assert.equal(bedMaterials.has(material),false);material.emissive.set('#a98236');material.emissiveIntensity=.35;}
 for(const material of bedMaterials)assert.equal(material.emissive.getHex(),0);
 assert.ok(s.assets.every(a=>a.releaseOwner&&a.transform&&a.materialId));s.dispose();
});

test('scene disposal is idempotent and never releases another instance resources',()=>{
 const a=makeScene(),b=makeScene();let otherReleases=0,ownRelease=0;const other=new Set(),own=new Set();
 b.world.traverse(o=>{if(o.isMesh){other.add(o.geometry);other.add(o.material);}});a.world.traverse(o=>{if(o.isMesh){own.add(o.geometry);own.add(o.material);}});
 for(const resource of other)resource.addEventListener('dispose',()=>otherReleases++);for(const resource of own)resource.addEventListener('dispose',()=>ownRelease++);
 a.dispose();const count=ownRelease;assert.ok(count>0);a.dispose();assert.equal(ownRelease,count);assert.equal(otherReleases,0);assert.equal(a.resourceStats().disposed,true);
 b.dispose();assert.ok(otherReleases>0);
});

test('all Arles mesh attributes are finite with matte nonmetallic materials',()=>{
 const s=makeScene();s.world.traverse(o=>{if(o.isMesh){for(const key of ['position','normal'])assert.ok([...o.geometry.attributes[key].array].every(Number.isFinite),o.name+' invalid '+key);if(o.name.startsWith('Endpoint_'))assert.ok(o.material.isMeshBasicMaterial);else{assert.equal(o.material.metalness,0);assert.ok(o.material.roughness>=.75);}}});
 assert.deepEqual(s.player.position.toArray(),POS.S);s.dispose();
});

test('fitted shadow frustum contains every visible caster through all four rotor poses',()=>{
 const s=makeScene(),light=new THREE.DirectionalLight();light.position.set(...ARLES_PRESENTATION.keyPosition);light.updateMatrixWorld(true);light.target.updateMatrixWorld(true);
 const extent=ARLES_PRESENTATION.shadowExtent;Object.assign(light.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:.1,far:40});light.shadow.updateMatrices(light);const c=light.shadow.camera;
 for(let turn=0;turn<4;turn++){
  s.rotor.rotation.y=turn*Math.PI/2;s.world.updateMatrixWorld(true);
  s.world.traverse(o=>{if(!o.isMesh||!o.castShadow)return;for(let p=o;p;p=p.parent)if(!p.visible)return;
   const attr=o.geometry.attributes.position;for(let i=0;i<attr.count;i++){const p=new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(o.matrixWorld).applyMatrix4(c.matrixWorldInverse);assert.ok(Math.abs(p.x)<extent&&Math.abs(p.y)<extent&&-p.z>c.near&&-p.z<c.far,o.name+' shadow clipping');}
  });
 }
 s.dispose();
});
