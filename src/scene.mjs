import * as THREE from '../vendor/three.module.js';
import {build,palette} from './assets-source.js';
import {POS,MASK,VIEWS} from './level.mjs';
import {applyQuietArles} from './quiet-arles.mjs';
export function makeScene({style='quiet-arles'}={}){
 const world=new THREE.Group();world.name='Atrium_G2';
 const material={};for(const [name,c]of Object.entries(palette))material[name]=new THREE.MeshStandardMaterial({name:'MAT_'+name,color:c,roughness:1,metalness:0});
 function box(name,size,pos,mat='chalk'){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material[mat]);m.name=name;m.position.set(...pos);m.castShadow=m.receiveShadow=true;world.add(m);return m;}
 function add(id,name,pos,color='red'){const o=build(id,color);o.name=name;o.position.set(...pos);world.add(o);return o;}
 box('Base',[10.8,.4,6.8],[.9,-.2,0],'mist');
 box('RearWall',[10.8,5.7,.25],[.9,2.85,-3.4]);box('LeftWall',[.25,3.5,5.8],[-4.4,1.75,-.45]);
 box('RearShelf',[3.5,.25,1.25],[-1.6,4.1,-2.6]);
 box('FarPlatform',[2.35,.25,2.4],[5.225,2.995,.9]);
 box('FarSupport',[.35,2.87,.35],[5.9,1.435,1.55],'mist');
 box('FarSupportRear',[.35,2.87,.35],[5.9,1.435,-.1],'mist');
 const mechanism=add('rotator','M01',[0,0,0]),rotor=mechanism.getObjectByName('Rotator');
 const mask=box('TransitionMask',MASK.size,MASK.position,'slate');mask.rotation.y=MASK.rotationY;
 for(const k of [-1,1])box('MaskFoot_'+k,[.09,.25,.09],[4.45+k*.26,3.215,1.8-k*.26],'slate');
 const goalFrame=add('portal','GoalFrame',[5.7,3.12,-.2]);goalFrame.scale.set(.8,.85,.8);
 const door=add('door','GoalDoor',[5.7,3.12,-.25],'ochre');door.scale.set(.8,.95,.8);
 const player=add('traveler','Player',POS.S,'chalk');
 const safe=add('marker','SafeNode',POS.S);safe.scale.set(1.3,1,1.3);
 const markerMaterial=new THREE.MeshStandardMaterial({color:palette.ochre,roughness:1});
 const markers={};for(const name of ['T','F','G']){const m=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.035,24),markerMaterial);m.name='Target_'+name;m.position.set(...POS[name]);m.position.y+=.025;m.userData.target=name;world.add(m);markers[name]=m;}
 const endPoints={};for(const name of ['A','B']){const marker=new THREE.Mesh(new THREE.SphereGeometry(.075,12,8),new THREE.MeshBasicMaterial({color:name==='A'?0x2e6862:0xce9a49}));marker.position.set(...POS[name]);marker.visible=false;marker.name='Endpoint_'+name;world.add(marker);endPoints[name]=marker;}
 world.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});
 const parts={world,rotor,mask,player,door,markers,endPoints,material,style:'classic'};
 const geometries=new Set(),privateMaterials=new Set([...Object.values(material),markerMaterial,...Object.values(endPoints).map(o=>o.material)]);world.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);});let disposed=false;
 parts.dispose=()=>{if(disposed)return;disposed=true;for(const g of geometries)g.dispose();for(const m of privateMaterials)m.dispose();};
 return style==='classic'?parts:applyQuietArles(parts);
}
export function setPose(scene,state){scene.rotor.rotation.y=state.turn*Math.PI/2;scene.player.position.set(...POS[state.node]);scene.world.getObjectByName('LeftWall').visible=state.camera!==1;scene.world.updateMatrixWorld(true);}
export function makeCamera(aspect=1,pose=0){const c=new THREE.OrthographicCamera(-7*aspect,7*aspect,7,-7,.1,100);c.layers.enable(1);const target=new THREE.Vector3(1.1,2,0);c.position.copy(target).add(new THREE.Vector3(...VIEWS[pose]).normalize().multiplyScalar(25));c.lookAt(target);c.updateMatrixWorld();c.updateProjectionMatrix();return c;}
