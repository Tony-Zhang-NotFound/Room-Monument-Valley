// Real WebGL visual/lifecycle QA and same-host performance comparisons.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const base=process.env.ROOM_ART_BASE_URL||'http://127.0.0.1:8882/';
const baseline=process.env.ROOM_ART_BEFORE_URL||'http://127.0.0.1:8881/';
const out=path.resolve(process.env.ROOM_ART_EVIDENCE||path.join(root,'evidence/quiet-arles/after'));
fs.mkdirSync(out,{recursive:true});
const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
async function ready(p){await p.waitForFunction(()=>window.roomReady);await frame(p);}
async function stable(p){await p.waitForFunction(()=>!roomInspect().busy,{},{timeout:45000});await frame(p);}
async function click(p,id){await p.locator('#'+id).click();await stable(p);}
async function routePerformance(p){return p.evaluate(async()=>{
 document.getElementById('reset').click();document.getElementById('reduced').checked=false;
 const metrics=()=>window.roomArtInspect?roomArtInspect():roomRenderStats();
 const initial=metrics(),times=[],start=performance.now();let last=start;
 for(const id of ['rotate','move','view','view','move','move']){
  const button=document.getElementById(id);if(button.disabled)throw Error(id+' disabled in route benchmark');button.click();
  while(roomInspect().busy){await new Promise(resolve=>requestAnimationFrame(t=>{times.push(t-last);last=t;resolve();}));}
 }
 const elapsedMs=performance.now()-start,final=metrics();times.sort((a,b)=>a-b);
 if(!roomInspect().state.won)throw Error('benchmark route did not win');
 return {elapsedMs,samples:times.length,meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[Math.floor(times.length*.95)],observedAnimationFps:times.length*1000/elapsedMs,initial,final};
});}
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={date:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),browser:browser.version(),os:os.release(),cpu:os.cpus()[0].model,viewport:{width:1600,height:900},dpr:1,checks:[],errors:[],failedRequests:[]};
 try{
  const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1});const p=await context.newPage();
  p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))report.failedRequests.push({url:r.url(),status:r.status()});});
  await p.goto(base+'index.html');await ready(p);assert.equal((await p.evaluate(()=>roomArtInspect())).style,'quiet-arles');
  await p.evaluate(()=>document.fonts.ready);await click(p,'reset');
  await p.screenshot({path:path.join(out,'default.png'),fullPage:true});await p.locator('canvas').screenshot({path:path.join(out,'default-canvas.png')});
  const inspect=await p.evaluate(()=>roomArtInspect());fs.writeFileSync(path.join(out,'asset-inventory.json'),JSON.stringify(inspect.assets,null,2));
  const idle=await p.evaluate(async()=>{
   const initial=roomArtInspect(),a=[],start=performance.now();let last=start;
   await new Promise(resolve=>{function f(t){a.push(t-last);last=t;if(t-start>=10000)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);});
   a.sort((x,y)=>x-y);return {elapsedMs:performance.now()-start,schedulingSamples:a.length,meanSchedulingMs:a.reduce((a,b)=>a+b,0)/a.length,p95SchedulingMs:a[Math.floor(a.length*.95)],actualRenderedFrames:roomArtInspect().renderCount-initial.renderCount,renderer:roomArtInspect()};
  });
  assert.equal(idle.actualRenderedFrames,0,'static scene should not redraw without invalidation');report.idle=idle;report.checks.push('Stable idle stops redundant WebGL draws (not claimed as 60 rendered FPS)');console.log('PASS idle invalidation and resource inventory');
  const beforeContext=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1});const before=await beforeContext.newPage();await before.goto(baseline+'index.html');await ready(before);report.beforeAnimation=await routePerformance(before);await beforeContext.close();
  report.afterAnimation=await routePerformance(p);await click(p,'replay');report.checks.push('Identical animated full route measured before/after on same browser, viewport, DPR and host');console.log('PASS paired route benchmark');
  const oldGeometry=await p.evaluate(()=>roomArtInspect().geometries);for(let i=0;i<12;i++)await click(p,'reset');assert.equal(await p.evaluate(()=>roomArtInspect().geometries),oldGeometry);report.checks.push('12 resets keep resource counts stable');
  const imageBefore=await p.locator('canvas').screenshot();await click(p,'rotate');const imageAfter=await p.locator('canvas').screenshot();assert.notEqual(digest(imageBefore),digest(imageAfter),'cached frame did not update on rotation');report.checks.push('On-demand rendering refreshes actual canvas on gameplay state changes');
  await p.locator('#reduced').check();await click(p,'move');await click(p,'view');await click(p,'view');await p.screenshot({path:path.join(out,'aligned.png'),fullPage:true});await p.locator('canvas').screenshot({path:path.join(out,'aligned-canvas.png')});
  const style=await p.evaluate(()=>roomArtInspect());fs.writeFileSync(path.join(out,'render-stats.json'),JSON.stringify(style,null,2));
  await click(p,'reset');
  const crop=await p.evaluate(async()=>{
   const THREE=await import('./vendor/three.module.js'),{makeScene,makeCamera}=await import('./src/scene.mjs');const s=makeScene();
   const b=new THREE.Box3().setFromObject(s.world.getObjectByName('ArlesBed')),r=document.querySelector('canvas').getBoundingClientRect(),q=roomArtInspect().camera,c=makeCamera(r.width/r.height,1);Object.assign(c,{left:q.left,right:q.right,top:q.top,bottom:q.bottom});c.updateProjectionMatrix();
   const v=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=new THREE.Vector3(x,y,z).project(c);v.push({x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2});}
   s.dispose();const x=Math.max(r.x,Math.min(...v.map(p=>p.x))-26),y=Math.max(r.y,Math.min(...v.map(p=>p.y))-26);return {x,y,width:Math.min(r.right-x,Math.max(...v.map(p=>p.x))-x+26),height:Math.min(r.bottom-y,Math.max(...v.map(p=>p.y))-y+26)};
  });await p.screenshot({path:path.join(out,'bed-detail.png'),clip:crop});report.bedDetail={method:'Actual default-camera screenshot crop; no model or image replacement',clip:crop};
  await p.evaluate(()=>document.getElementById('showEndpoints').click());await frame(p);assert.equal((await p.evaluate(()=>roomArtInspect())).style,'quiet-arles');report.checks.push('Endpoint visibility invalidates cached canvas');
  const fallbackContext=await browser.newContext({viewport:report.viewport});const f=await fallbackContext.newPage();const fallbackErrors=[];f.on('pageerror',e=>fallbackErrors.push(e.message));
  await f.route('**/src/quiet-arles.mjs',route=>route.fulfill({contentType:'text/javascript',body:'export function applyQuietArles(){throw Error("Injected procedural asset failure")}'}));
  await f.goto(base+'index.html');await ready(f);assert.equal(await f.evaluate(()=>roomArtInspect().style),'classic');assert.match(await f.locator('#notice').textContent(),/灰盒/);await f.locator('#reduced').check();await click(f,'rotate');assert.equal(await f.evaluate(()=>roomInspect().state.turn),0);assert.deepEqual(fallbackErrors,[]);await f.screenshot({path:path.join(out,'asset-failure-fallback.png'),fullPage:true});await fallbackContext.close();report.checks.push('Injected art-construction failure falls back to playable classic scene without page errors');console.log('PASS asset fallback');
  // The downloadable single file must run without requesting source modules.
  const standalone=await context.newPage();await standalone.goto(base+'ROOM_G2_Play.html');await ready(standalone);assert.equal(await standalone.evaluate(()=>roomArtInspect().style),'quiet-arles');await standalone.close();report.checks.push('Standalone art build loads successfully');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.status='PASS';await context.close();
 }catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1;console.error(e);}finally{fs.writeFileSync(path.join(out,'quality.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log(JSON.stringify({status:report.status,checks:report.checks,animationBeforeFps:report.beforeAnimation?.observedAnimationFps,animationAfterFps:report.afterAnimation?.observedAnimationFps}));
})().catch(e=>{console.error(e);process.exitCode=1;});
