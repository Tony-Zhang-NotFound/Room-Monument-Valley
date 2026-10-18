// Supplemental real-browser measurements; SwiftShader is not a target-hardware benchmark.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const out=path.resolve(process.env.ROOM_EVIDENCE_DIR || path.join(__dirname,'../../evidence/g2_5/current'));
const base=process.env.ROOM_TEST_BASE_URL || 'http://127.0.0.1:8765/room-g2/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.ROOM_CHROMIUM || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900}});await page.goto(base+'index.html');await page.waitForFunction(()=>window.roomReady);
  async function frames(interacting){return page.evaluate(async interacting=>{
   const values=[],start=performance.now();let last=start,actions=0;
   await new Promise(resolve=>{function frame(now){values.push(now-last);last=now;
    if(interacting&&!roomInspect().busy){const s=roomInspect().state;let id=s.won?'replay':s.node==='S'?(s.turn===0?'move':'rotate'):s.node==='T'?(s.camera===0?'move':'view'):'move';document.getElementById(id).click();actions++;}
    if(now-start>=30000)resolve();else requestAnimationFrame(frame);
   }requestAnimationFrame(frame);});
   values.sort((a,b)=>a-b);return {elapsedMs:performance.now()-start,frames:values.length,meanMs:values.reduce((a,b)=>a+b,0)/values.length,p50Ms:values[Math.floor(values.length*.5)],p95Ms:values[Math.floor(values.length*.95)],maxMs:values.at(-1),averageFps:values.length*1000/(performance.now()-start),actions,lastState:roomInspect()};
  },interacting);}
  const idle=await frames(false);console.log('30s idle measured');const interacting=await frames(true);console.log('30s interaction measured');
  fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify({date:new Date().toISOString(),browser:browser.version(),viewport:{width:1600,height:900},renderer:'SwiftShader software WebGL 2',method:'requestAnimationFrame intervals; no GPU timer instrumentation',scope:'diagnostic only; target hardware and Booklet budget unavailable',idle,interacting},null,2));await page.close();
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:'reduce'});
  const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'index.html');await p.waitForFunction(()=>window.roomReady);
  for(const id of ['rotate','move','view','view','move','move']){await p.locator('#'+id).tap();await p.waitForFunction(()=>!roomInspect().busy);}
  const state=await p.evaluate(()=>roomInspect());assert.equal(state.state.won,true);assert.deepEqual(errors,[]);await p.screenshot({path:path.join(out,'touch-emulation-win.png'),fullPage:true});await p.locator('#replay').tap();assert.equal((await p.evaluate(()=>roomInspect())).state.node,'S');
  const layout=await p.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,canvas:document.querySelector('canvas').getBoundingClientRect().toJSON()}));
  assert.equal(layout.scrollWidth,layout.width);fs.writeFileSync(path.join(out,'touch-emulation.json'),JSON.stringify({device:'Chromium emulation, 390x844 CSS px, DPR2, touch; not physical-device QA',state,layout,errors,journey:'PASS',replay:'PASS'},null,2));await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
