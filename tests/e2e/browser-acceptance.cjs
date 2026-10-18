// Real Chromium/WebGL acceptance. Playwright is supplied by the cloud runtime.
// Start the documented HTTP server first. This script does not publish anything.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const out=path.resolve(process.env.ROOM_EVIDENCE_DIR || path.join(root,'evidence/g2_5/current'));
const base=process.env.ROOM_TEST_BASE_URL || 'http://127.0.0.1:8765/room-g2/';
const KEY='room.atrium.g2.02';
fs.mkdirSync(out,{recursive:true});
const results=[],errors=[],network=[],matrix=[],incidental=[];
const initial={node:'S',turn:3,camera:1,won:false};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser,context,page;
const inspect=()=>page.evaluate(()=>roomInspect());
const stable=()=>page.waitForFunction(()=>window.roomReady&&!roomInspect().busy,{},{timeout:45000});
async function click(id){await page.locator('#'+id).click();await stable();}
async function fresh(file='index.html'){
 await page.goto(base+file);await page.waitForFunction(()=>window.roomReady);
 await page.evaluate(k=>localStorage.removeItem(k),KEY);await page.reload();
 await page.waitForFunction(()=>window.roomReady);await page.locator('#scene').scrollIntoViewIfNeeded();
}
async function state(expected){assert.deepEqual((await inspect()).state,expected);}
async function reduced(){await page.locator('#reduced').check();}
async function top(){await reduced();await click('rotate');await click('move');}
async function align(){for(let i=0;i<2;i++)await click('view');}
async function test(ids,name,fn){
 const start=Date.now();try{const detail=await fn();results.push({ids,name,status:'PASS',elapsedMs:Date.now()-start,detail});console.log('PASS',ids,name);}
 catch(e){results.push({ids,name,status:'FAIL',error:e.stack});console.error('FAIL',ids,name,e.message);await page.screenshot({path:path.join(out,'FAIL-'+ids.replaceAll('/','-')+'.png'),fullPage:true}).catch(()=>{});}
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({results,errors,network,matrix,incidental},null,2));
}
async function projection(){return page.evaluate(async()=>{
 const THREE=await import('./vendor/three.module.js');const {POS}=await import('./src/level.mjs');const {makeCamera}=await import('./src/scene.mjs');
 const c=document.querySelector('#scene'),r=c.getBoundingClientRect(),s=roomInspect().state;
 const camera=makeCamera(r.width/r.height,s.camera),half=Math.max(5.4,6.5/(r.width/r.height));
 Object.assign(camera,{left:-half*r.width/r.height,right:half*r.width/r.height,top:half,bottom:-half});camera.updateProjectionMatrix();
 const points=Object.fromEntries(Object.entries(POS).map(([n,p])=>{const v=new THREE.Vector3(...p).project(camera);return [n,{x:r.x+(v.x+1)*r.width/2,y:r.y+(1-v.y)*r.height/2}]}));
 return {state:s,canvas:{x:r.x,y:r.y,width:r.width,height:r.height,bufferWidth:c.width,bufferHeight:c.height},dpr:devicePixelRatio,debug:document.querySelector('#debug').textContent,points,horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
});}
async function pickProbe(target){return page.evaluate(async(target)=>{
 const THREE=await import('./vendor/three.module.js');const {makeScene,setPose,makeCamera}=await import('./src/scene.mjs');
 const s=roomInspect().state,parts=makeScene();setPose(parts,s);
 parts.rotor.traverse(o=>{if(o.isMesh)o.userData.rotate=true;});
 for(const [n,m]of Object.entries(parts.markers))m.visible=({S:'T',T:'F',F:'G'}[s.node]===n);
 const r=document.querySelector('#scene').getBoundingClientRect(),cam=makeCamera(r.width/r.height,s.camera),half=Math.max(5.4,6.5/(r.width/r.height));
 Object.assign(cam,{left:-half*r.width/r.height,right:half*r.width/r.height,top:half,bottom:-half});cam.updateProjectionMatrix();parts.world.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(),object=target==='rotor'?parts.rotor:parts.markers[target];
 const box=new THREE.Box3().setFromObject(object),center=box.getCenter(new THREE.Vector3()).project(cam);
 const cx=(center.x+1)*r.width/2,cy=(1-center.y)*r.height/2;
 for(let d=0;d<=80;d+=4)for(const [dx,dy]of [[d,0],[-d,0],[0,d],[0,-d],[d,d],[-d,-d]]){
  const x=cx+dx,y=cy+dy;if(x<0||y<0||x>r.width||y>r.height)continue;
  ray.setFromCamera(new THREE.Vector2(x/r.width*2-1,1-y/r.height*2),cam);
  const hits=ray.intersectObject(parts.world,true),hit=hits[0];
  if(hit&&(target==='rotor'?hit.object.userData.rotate:hit.object.userData.target===target))return {x:r.x+x,y:r.y+y,firstHit:hit.object.name,visible:hit.object.visible};
 }
 return {blocked:true,target,projectedCenter:{x:r.x+cx,y:r.y+cy}};
},target);}
(async()=>{
 browser=await chromium.launch({executablePath:process.env.ROOM_CHROMIUM || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1,recordVideo:{dir:path.join(out,'video'),size:{width:1280,height:720}}});
 page=await context.newPage();page.on('pageerror',e=>errors.push({url:page.url(),message:e.message}));
 page.on('console',m=>{if(m.type()==='error'){
  const entry={url:page.url(),console:m.text(),location:m.location()};
  if(new URL(m.location().url||page.url()).pathname==='/favicon.ico'&&m.text().includes('404'))incidental.push(entry);else errors.push(entry);
 }});
 page.on('response',r=>{if(r.status()>=400){const entry={url:r.url(),status:r.status()};if(new URL(r.url()).pathname==='/favicon.ico'&&r.status()===404)incidental.push(entry);else network.push(entry);}});
 page.on('requestfailed',r=>network.push({url:r.url(),failure:r.failure()}));
 await fresh();
 const metadata={date:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'}).trim(),browser:browser.version(),os:{platform:os.platform(),release:os.release(),arch:os.arch(),cpu:os.cpus()[0]?.model,logicalCPUs:os.cpus().length},base,rendering:'Real Chromium WebGL 2 using SwiftShader software rendering; not target hardware performance',engineeringToleranceCssPx:1,authoredTolerance:'Not yet approved by owner',browserInfo:await page.evaluate(()=>{const gl=document.querySelector('#scene').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {ua:navigator.userAgent,dpr:devicePixelRatio,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):null};})};
 fs.writeFileSync(path.join(out,'browser-environment.json'),JSON.stringify(metadata,null,2));
 await test('T01/T02/T03/T04/T05/T06','initial state, rotations, move guards and commit',async()=>{
  await state(initial);await page.keyboard.press('Space');await state(initial);
  await reduced();for(const turn of [0,1,2,3]){await click('rotate');assert.equal((await inspect()).state.turn,turn);}
  await click('rotate');await page.locator('#reduced').uncheck();await page.locator('#move').click();
  assert.equal((await inspect()).busy,true);assert.equal((await inspect()).state.node,'S');await stable();assert.equal((await inspect()).state.node,'T');
  await page.keyboard.press('KeyR');await page.keyboard.press('Space');assert.equal((await inspect()).state.node,'T');assert.equal((await inspect()).busy,false);
 });
 await test('T07/T08/T09/T15/T16','animated journey, pending input, pause, wrong views, win and replay',async()=>{
  await fresh();await page.locator('#rotate').click();await page.keyboard.press('KeyV');assert.equal((await inspect()).state.camera,1);
  await page.keyboard.press('Escape');const rotationPaused=await inspect();await sleep(300);assert.equal((await inspect()).busy,true);assert.deepEqual((await inspect()).state,rotationPaused.state);await click('resume');
  await page.locator('#move').click();await sleep(450);await page.keyboard.press('KeyV');assert.equal((await inspect()).state.camera,1);
  await page.keyboard.press('Escape');const paused=await inspect();assert.equal(paused.paused,true);await sleep(650);assert.deepEqual((await inspect()).player,paused.player);
  await page.screenshot({path:path.join(out,'pause-mid-walk.png')});await click('resume');assert.equal((await inspect()).state.node,'T');
  await page.keyboard.press('Space');assert.equal((await inspect()).busy,false);await page.locator('#view').click();await page.keyboard.press('Space');await page.keyboard.press('KeyR');assert.equal((await inspect()).state.camera,1);await stable();assert.equal((await inspect()).state.camera,2);
  await page.keyboard.press('Space');assert.equal((await inspect()).busy,false);await click('view');await click('move');assert.equal((await inspect()).state.node,'F');
  await click('move');assert.equal((await inspect()).state.won,true);assert.equal(await page.locator('#winPanel').isVisible(),true);
  await page.screenshot({path:path.join(out,'win.png')});await click('replay');await state(initial);
 });
 await test('T10/T11','reset interrupts rotation/walk; undo restores stable pose',async()=>{
  await fresh();await page.locator('#rotate').click();await sleep(150);await click('reset');await sleep(1000);await state(initial);
  await reduced();await click('rotate');await page.locator('#reduced').uncheck();await page.locator('#move').click();await sleep(350);await click('reset');await sleep(1000);
  await state(initial);assert.deepEqual((await inspect()).player,[-3.5,0,1.4]);assert.equal((await inspect()).busy,false);
  await page.locator('#rotate').click();await page.keyboard.press('Escape');await click('pauseReset');await state(initial);assert.equal((await inspect()).paused,false);
  await top();await click('undo');assert.deepEqual((await inspect()).player,[-3.5,0,1.4]);assert.equal((await inspect()).state.turn,0);
  await click('undo');await state(initial);
 });
 await test('T12','reload pending walk/rotation restores committed state; undo clears',async()=>{
  await fresh();await reduced();await click('rotate');await page.locator('#reduced').uncheck();await page.locator('#move').click();await sleep(200);
  const save=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);assert.equal(save.state.node,'S');assert.equal(save.state.turn,0);
  await page.reload();await page.waitForFunction(()=>window.roomReady);await state({...initial,turn:0});assert.equal((await inspect()).undoCount,0);
  await page.locator('#rotate').click();await sleep(100);await page.reload();await page.waitForFunction(()=>window.roomReady);await state({...initial,turn:0});
  return {checkpoint:save};
 });
 await test('T13','corrupt/wrong-version saves and storage denial',async()=>{
  for(const raw of ['{broken',JSON.stringify({schema:99,level:'atrium-g2-02',state:initial}),JSON.stringify({schema:1,level:'atrium-g2-02',state:{...initial,node:'X'}})]){
   await page.evaluate(({k,raw})=>localStorage.setItem(k,raw),{k:KEY,raw});await page.reload();await page.waitForFunction(()=>window.roomReady);await state(initial);
  }
  const denied=await browser.newContext();await denied.addInitScript(()=>{Storage.prototype.getItem=Storage.prototype.setItem=()=>{throw new DOMException('Denied','SecurityError');};});
  const p=await denied.newPage();const localErrors=[];p.on('pageerror',e=>localErrors.push(e.message));await p.goto(base+'index.html');await p.waitForFunction(()=>window.roomReady);
  assert.match(await p.locator('#saveStatus').textContent(),/不可用/);await p.locator('#reduced').check();await p.locator('#rotate').click();assert.equal((await p.evaluate(()=>roomInspect())).state.turn,0);assert.deepEqual(localErrors,[]);await denied.close();
 });
 await test('T14','nine real browser views with actual canvas and endpoint debug',async()=>{
  await fresh();await top();await align();
  for(const [width,height]of [[1600,900],[1200,900],[900,1600]]){
   await page.setViewportSize({width,height});await page.locator('#scene').scrollIntoViewIfNeeded();
   for(let view=0;view<3;view++){
    while((await inspect()).state.camera!==view)await click('view');
    await page.locator('#scene').scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);await sleep(150);
    const pose=await projection();const name=`C${view}_${width}x${height}`;
    await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});await page.locator('#scene').screenshot({path:path.join(out,name+'_canvas.png')});
    const delta=Number(pose.debug.match(/端点偏差 ([\d.]+) px/)[1]);matrix.push({viewport:{width,height},view,fullPage:name+'.png',canvasScreenshot:name+'_canvas.png',...pose,renderedDebugDeltaCssPx:delta});
    assert.equal(pose.horizontalOverflow,false);if(view===0)assert.ok(delta<=1,`C0 endpoint delta ${delta}`);else assert.ok(delta>1);
   }
  }
  await page.setViewportSize({width:1600,height:900});
  return {tolerance:'Engineering <=1 CSS px only; authored approval pending',count:matrix.length};
 });
 await test('T17','real canvas pointer hits and button fallback',async()=>{
  await fresh();await reduced();const rotor=await pickProbe('rotor');assert.ok(!rotor.blocked,'no exposed stair hit');await page.mouse.click(rotor.x,rotor.y);await stable();assert.equal((await inspect()).state.turn,0);
  const marker=await pickProbe('T');if(!marker.blocked){await page.mouse.click(marker.x,marker.y);await stable();}
  const pointerMoved=(await inspect()).state.node==='T';if(!pointerMoved)await click('move');assert.equal((await inspect()).state.node,'T');
  return {rotor,marker,pointerMoved,fallback:'MOVE button reaches T'};
 });
 await test('T18','system reduced motion reaches every stable transition',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await fresh();assert.equal(await page.locator('#reduced').isChecked(),true);
  for(const id of ['rotate','move','view','view','move','move']){await page.locator('#'+id).click();assert.equal((await inspect()).busy,false,'reduced motion must commit synchronously');}
  assert.equal((await inspect()).state.won,true);await click('inspect');await click('back');await click('back');await click('back');assert.equal((await inspect()).state.node,'S');await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await test('T19','real browser with WebGL disabled shows readable alert',async()=>{
  const disabled=await chromium.launch({executablePath:process.env.ROOM_CHROMIUM || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-webgl']});
  const p=await disabled.newPage();const expectedErrors=[];p.on('pageerror',e=>expectedErrors.push(e.message));await p.goto(base+'index.html');await p.locator('#bootError').waitFor({state:'visible'});
  assert.match(await p.locator('#bootError').textContent(),/场景未能启动/);await p.screenshot({path:path.join(out,'webgl-unavailable.png')});await disabled.close();return {expectedErrors};
 });
 await test('T21-local','source and bundled HTML work on a non-root subpath',async()=>{
  await fresh('ROOM_G2_Play.html');await state(initial);await top();await align();await click('move');await click('move');assert.equal((await inspect()).state.won,true);await click('replay');
  return {bundle:'Real WebGL journey and replay PASS',remoteCI:'NOT EXECUTED',hostedDeployment:'NOT EXECUTED'};
 });
 assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(network.length,0,JSON.stringify(network));
 await context.close();await browser.close();
 const summary={metadata,results,errors,network,matrix,incidental,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length};
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({passed:summary.passed,failed:summary.failed,matrix:matrix.length}));if(summary.failed)process.exitCode=1;
})().catch(async e=>{console.error(e);fs.writeFileSync(path.join(out,'browser-fatal.json'),JSON.stringify({error:e.stack,results,errors,network,matrix,incidental},null,2));await context?.close().catch(()=>{});await browser?.close();process.exitCode=1;});
