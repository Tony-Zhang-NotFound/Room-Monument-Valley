// R04: reproduce a real architectural occlusion and verify the labeled fallback.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const out=path.resolve(process.env.ROOM_EVIDENCE_DIR || path.join(root,'evidence/g2_5/current'));
(async()=>{
 const b=await chromium.launch({executablePath:process.env.ROOM_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const p=await b.newPage({viewport:{width:1600,height:900}});await p.goto((process.env.ROOM_TEST_BASE_URL||'http://127.0.0.1:8765/room-g2/')+'index.html');await p.waitForFunction(()=>window.roomReady);
  await p.locator('#reset').click();await p.locator('#reduced').check();for(const id of ['rotate','view','view'])await p.locator('#'+id).click();
  const hit=await p.evaluate(async()=>{
   const THREE=await import('./vendor/three.module.js');const {makeScene,setPose,makeCamera}=await import('./src/scene.mjs');
   const parts=makeScene(),s=roomInspect().state;setPose(parts,s);parts.rotor.traverse(o=>{if(o.isMesh)o.userData.rotate=true;});parts.world.updateMatrixWorld(true);
   const r=document.querySelector('canvas').getBoundingClientRect(),cam=makeCamera(r.width/r.height,s.camera),half=Math.max(5.4,6.5/(r.width/r.height));
   Object.assign(cam,{left:-half*r.width/r.height,right:half*r.width/r.height,top:half,bottom:-half});cam.updateProjectionMatrix();
   const ray=new THREE.Raycaster();
   for(let y=200;y<750;y+=3)for(let x=400;x<850;x+=3){
    ray.setFromCamera(new THREE.Vector2(x/r.width*2-1,1-y/r.height*2),cam);const hits=ray.intersectObject(parts.world,true);
    if(hits.length>1&&!hits[0].object.userData.rotate&&!hits[0].object.userData.target&&hits.some(h=>h.object.userData.rotate))return {x:r.x+x,y:r.y+y,hits:hits.slice(0,5).map(h=>({name:h.object.name,rotate:!!h.object.userData.rotate,visible:h.object.visible}))};
   }
   return null;
  });
  assert.ok(hit,'expected existing occluded stair sample');const before=await p.evaluate(()=>roomInspect());await p.mouse.click(hit.x,hit.y);const after=await p.evaluate(()=>roomInspect());assert.deepEqual(after,before);
  await p.screenshot({path:path.join(out,'occluded-stair.png')});assert.equal(await p.locator('#rotate').isEnabled(),true);const fallbackLabel=await p.locator('#rotate').innerText();await p.locator('#rotate').click();const fallback=await p.evaluate(()=>roomInspect());assert.equal(fallback.state.turn,1);assert.equal(fallback.busy,false);
  const report={date:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),viewport:{width:1600,height:900},hit,before,after,fallbackLabel,fallback,status:'PASS with documented P1 first-hit limitation; explicit rotate button works'};
  fs.writeFileSync(path.join(out,'occluded-stair.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
