// Supplemental CPU geometry only. This does not exercise a browser or CSS layout.
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {makeCamera} from '../src/scene.mjs';
import {POS} from '../src/game/level.mjs';
const results=[];
for(const [width,height] of [[1600,900],[1200,900],[900,1600]])for(let view=0;view<3;view++){
 const camera=makeCamera(width/height,view),half=Math.max(5.4,6.5/(width/height));
 Object.assign(camera,{left:-half*width/height,right:half*width/height,top:half,bottom:-half});camera.updateProjectionMatrix();
 const a=new THREE.Vector3(...POS.A).project(camera),b=new THREE.Vector3(...POS.B).project(camera);
 results.push({width,height,camera:'C'+view,bridgeEndpointDeltaPx:Math.hypot((a.x-b.x)*width/2,(a.y-b.y)*height/2),browserStatus:'NOT_EXECUTED',screenshot:null});
}
fs.writeFileSync('evidence/g2_5/viewport-matrix.json',JSON.stringify({kind:'CPU analytical projection; viewport assumed equal to canvas, actual CSS unverified',tolerance:'No authored browser tolerance approved; no visual PASS assigned',results},null,2));
console.log(JSON.stringify(results,null,2));
