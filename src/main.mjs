import * as THREE from '../vendor/three.module.js';
import {createGame,decodeSave,encodeSave,transition} from './game.mjs';
import {makeScene,setPose,makeCamera} from './scene.mjs';
import {POS,VIEWS,route,samplePath} from './level.mjs';
const $=id=>document.getElementById(id),KEY='room.atrium.g2.02',canvas=$('scene');
const lifecycle=new AbortController();
let restored=null,storageBlocked=false;try{restored=decodeSave(localStorage.getItem(KEY));}catch{storageBlocked=true;}
const game=createGame(restored),scene=new THREE.Scene();
const requestedStyle=new URLSearchParams(window.location?.search||'').get('art')==='classic'?'classic':'quiet-arles';
let parts,sceneWarning='';
try{parts=makeScene({style:requestedStyle});}catch(error){parts=makeScene({style:'classic'});sceneWarning='房间美术未能加载，已切回可玩的灰盒场景。';console.warn('Quiet Arles fallback:',error.message);}
scene.add(parts.world);
const presentation=parts.presentation||{background:'#e8e9e3',keyColor:'#ffffff',keyIntensity:3,keyPosition:[-3,11,7],sky:'#ffffff',ambientGround:'#7c8781',ambientIntensity:2.2,exposure:1.1,groundY:-.425,maskName:'深灰色屏'};
let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true});}catch(e){parts.dispose?.();$('bootError').hidden=false;throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(presentation.background);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=presentation.exposure;
// First-pass measurements showed shadow rendering regressed idle frame times.
// Keep the existing shadow quality; only regenerate the map when a pose changes.
if(parts.style==='quiet-arles'){renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;}
const light=new THREE.DirectionalLight(presentation.keyColor,presentation.keyIntensity);light.position.set(...presentation.keyPosition);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:40});light.shadow.normalBias=.025;light.shadow.radius=3;scene.add(light,new THREE.HemisphereLight(presentation.sky,presentation.ambientGround,presentation.ambientIntensity));
if(presentation.fillIntensity){const fill=new THREE.DirectionalLight('#E9E6FF',presentation.fillIntensity);fill.position.set(-5,6,7);scene.add(fill);}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:presentation.background,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=presentation.groundY;ground.receiveShadow=true;scene.add(ground);
const camera=makeCamera(1,game.state.camera),target=new THREE.Vector3(1.1,2,0),raycaster=new THREE.Raycaster();
let animation=null,paused=false,last=0,winDismissed=false,renderDirty=true,renderCount=0;
$('reduced').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
const viewNames=['连接视角','侧向观察','正面观察'],nodeNames={S:'地面安全点',T:'旋转梯顶',F:'门前平台',G:'光下的门'};
function setView(v){camera.position.copy(target).add(new THREE.Vector3(...VIEWS[v]).normalize().multiplyScalar(25));camera.lookAt(target);camera.updateMatrixWorld();}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const a=w/h,half=Math.max(5.4,6.5/a);camera.left=-half*a;camera.right=half*a;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();}
function save(){try{localStorage.setItem(KEY,encodeSave(game.state));$('saveStatus').textContent='已保存当前稳定步骤 · 仅当前浏览器';storageBlocked=false;}catch{storageBlocked=true;$('saveStatus').textContent='本地保存不可用；本次会话仍可继续。';}}
function status(message){if(message)$('notice').textContent=message;}
function hint(){const s=game.state;if(s.won)return '已抵达。你也可以返回，观察空间原本的样子。';if(s.node==='S')return s.turn===0?'楼梯已朝向平台，可以走上去了。':'在安全点转动楼梯，观察梯顶的位置。';if(s.node==='T')return s.camera===0?`边缘重合了。穿过${presentation.maskName}后，看看另一边。`:'边缘还没有接上。试着换一个观察方向。';return '已经跨过连接。沿平台走向门。';}
function sync(message){const s=game.state;setPose(parts,s);setView(s.camera);parts.door.traverse(o=>{if(o.isMesh){o.material.emissive=new THREE.Color(s.won?'#a98236':'#000000');o.material.emissiveIntensity=s.won?.35:0;}});refresh(message||hint());}
function refresh(message){const s=game.state;status(message);$('viewName').textContent=viewNames[s.camera];$('position').textContent=nodeNames[s.node];
 const busy=game.busy||paused;
 $('rotate').disabled=busy||s.node!=='S';$('move').disabled=busy||!transition(s,{type:'MOVE'}).ok;$('back').disabled=busy||!transition(s,{type:'BACK'}).ok;$('view').disabled=busy;$('undo').disabled=busy||!game.undoCount;
 $('move').innerHTML=(s.node==='S'?'走上楼梯':s.node==='T'?'穿过连接':s.node==='F'?'走向门':'已抵达')+' <kbd>Space</kbd>';
 for(const [n,m]of Object.entries(parts.markers))m.visible=!busy&&({S:'T',T:'F',F:'G'}[s.node]===n)&&transition(s,{type:'MOVE'}).ok;
 const phase=s.node==='G'?4:s.node==='F'?3:s.node==='T'?(s.camera===0?3:2):s.turn===0?1:0;
 document.querySelectorAll('#steps li').forEach((el,i)=>{el.classList.toggle('done',i<phase);el.classList.toggle('active',i===phase);});
 const a=new THREE.Vector3(...POS.A).project(camera),b=new THREE.Vector3(...POS.B).project(camera);const px=Math.hypot((a.x-b.x)*canvas.clientWidth/2,(a.y-b.y)*canvas.clientHeight/2);
 $('debug').textContent=`节点 ${s.node} · 梯态 ${s.turn} · 视角 C${s.camera}\n${game.busy?'运动中 / 暂停提交':'稳定状态'} · 端点偏差 ${px.toFixed(2)} px\n${s.camera===0&&s.turn===0?'E01 条件成立':'E01 未激活'}`;
 if(storageBlocked)$('saveStatus').textContent='本地保存不可用；本次会话仍可继续。';
 renderer.shadowMap.needsUpdate=true;
 renderDirty=true;
}
function finish(a){if(!game.commit(a.token))return;animation=null;save();sync();if(game.state.won&&!winDismissed){$('winPanel').hidden=false;$('inspect').focus();}}
function dispatch(command){
 if(paused&&command.type!=='RESET')return;
 const result=game.begin(command);if(!result.ok){status(result.reason);return;}
 if(result.immediate){animation=null;paused=false;$('pause').textContent='暂停';$('pausePanel').hidden=true;$('winPanel').hidden=true;winDismissed=false;save();sync();return;}
 let duration=result.kind==='WALK'?({ST:4200,TS:4200,TF:2400,FT:2400,FG:1300,GF:1300}[result.from.node+result.next.node]):result.kind==='ROTATE'?850:700;
 if($('reduced').checked)duration=0;
 animation={...result,duration,elapsed:0,startPosition:parts.player.position.clone(),startRotation:parts.rotor.rotation.y,startCamera:camera.position.clone(),targetCamera:target.clone().add(new THREE.Vector3(...VIEWS[result.next.camera]).normalize().multiplyScalar(25)),points:result.kind==='WALK'?route(result.from.node,result.next.node):null};
 if(result.kind==='CAMERA')parts.world.getObjectByName('LeftWall').visible=false;
 if(result.kind==='WALK')winDismissed=false;
 refresh(result.kind==='WALK'?'正在沿路径前进…':result.kind==='ROTATE'?'正在转动楼梯…':'正在改变观察方向…');
 if(duration===0)finish(animation);
}
function setPaused(value){paused=value;$('pausePanel').hidden=!value;$('pause').textContent=value?'已暂停':'暂停';if(value)$('resume').focus();refresh(value?'已暂停。':hint());}
$('move').onclick=()=>dispatch({type:'MOVE'});$('back').onclick=()=>dispatch({type:'BACK'});$('rotate').onclick=()=>dispatch({type:'ROTATE'});$('view').onclick=()=>dispatch({type:'CAMERA',value:(game.state.camera+1)%3});$('undo').onclick=()=>dispatch({type:'UNDO'});$('reset').onclick=$('pauseReset').onclick=$('replay').onclick=()=>dispatch({type:'RESET'});$('pause').onclick=()=>setPaused(!paused);$('resume').onclick=()=>setPaused(false);$('inspect').onclick=()=>{winDismissed=true;$('winPanel').hidden=true;$('back').focus();};
$('showEndpoints').onchange=()=>{Object.values(parts.endPoints).forEach(o=>o.visible=$('showEndpoints').checked);renderDirty=true;};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPaused(true);},{signal:lifecycle.signal});
document.addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='Escape'){e.preventDefault();setPaused(!paused);return;}const tag=document.activeElement?.tagName;if(['INPUT','SELECT','TEXTAREA'].includes(tag)||e.code==='Space'&&['BUTTON','SUMMARY'].includes(tag))return;if(!$('winPanel').hidden)return;const commands={KeyR:{type:'ROTATE'},KeyV:{type:'CAMERA',value:(game.state.camera+1)%3},Space:{type:'MOVE'},KeyZ:{type:'UNDO'}};if(commands[e.code]){e.preventDefault();dispatch(commands[e.code]);}},{signal:lifecycle.signal});
parts.rotor.traverse(o=>{if(o.isMesh)o.userData.rotate=true;});canvas.addEventListener('pointerup',e=>{if(paused||game.busy)return;const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=raycaster.intersectObject(parts.world,true).find(h=>{for(let object=h.object;object;object=object.parent)if(!object.visible)return false;return true;});if(!hit)return;if(hit.object.userData.rotate)dispatch({type:'ROTATE'});else if(hit.object.userData.target===({S:'T',T:'F',F:'G'}[game.state.node]))dispatch({type:'MOVE'});},{signal:lifecycle.signal});
window.addEventListener('resize',()=>{resize();refresh();},{signal:lifecycle.signal});
renderer.setAnimationLoop(t=>{const dt=last?Math.min(t-last,80):0;last=t;
 if(animation&&!paused){const a=animation;a.elapsed+=dt;const k=Math.min(a.elapsed/a.duration,1),smooth=k*k*(3-2*k);
  renderDirty=true;
  if(a.kind==='ROTATE')parts.rotor.rotation.y=a.startRotation+Math.PI/2*smooth;
  if(a.kind==='CAMERA'){camera.position.lerpVectors(a.startCamera,a.targetCamera,smooth);camera.lookAt(target);camera.updateMatrixWorld();}
  if(a.kind==='WALK')parts.player.position.set(...samplePath(a.points,k));
  if(a.kind!=='CAMERA')renderer.shadowMap.needsUpdate=true;
  if(k===1)finish(a);
 }
 if(parts.style==='classic'||renderDirty){renderer.render(scene,camera);renderCount++;renderDirty=false;}
});
resize();sync(sceneWarning||(restored?'已恢复上次稳定步骤。':undefined));window.roomReady=true;
// Read-only QA seam; no globals mutate game state.
window.roomInspect=()=>({state:game.state,busy:game.busy,paused,player:parts.player.position.toArray(),undoCount:game.undoCount});
window.roomArtInspect=()=>({style:parts.style,renderMode:parts.style==='classic'?'continuous':'on-demand while stable; continuous while animating',renderCount,drawCalls:renderer.info?.render.calls,triangles:renderer.info?.render.triangles,geometries:renderer.info?.memory.geometries,textures:renderer.info?.memory.textures,resources:parts.resourceStats?.(),assets:parts.assets||[],camera:{position:camera.position.toArray(),left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom},background:presentation.background,exposure:renderer.toneMappingExposure});
canvas.addEventListener('webglcontextrestored',()=>{renderDirty=true;renderer.shadowMap.needsUpdate=true;},{signal:lifecycle.signal});
window.addEventListener('pagehide',event=>{if(event.persisted)return;lifecycle.abort();renderer.setAnimationLoop(null);parts.dispose?.();ground.geometry.dispose();ground.material.dispose();light.shadow.dispose();renderer.dispose?.();window.roomReady=false;},{signal:lifecycle.signal});
