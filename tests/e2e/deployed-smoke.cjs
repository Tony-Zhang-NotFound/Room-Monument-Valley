// Validate the actual hosted URL (or a local deployment-artifact preflight).
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const target=new URL(process.argv[2]||'https://tony-zhang-notfound.github.io/Room-Monument-Valley/');
const out=path.resolve(process.argv[3]||'/tmp/room-deployment-smoke');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const options={executablePath:process.env.ROOM_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']};
 // Use the environment's supported proxy for external destinations. Never bypass
 // an egress restriction or turn off certificate verification to make this pass.
 const rawProxy=process.env.HTTPS_PROXY||process.env.https_proxy;
 if(rawProxy&&!['localhost','127.0.0.1'].includes(target.hostname)){
  const proxy=new URL(rawProxy);options.proxy={server:proxy.origin};
  if(proxy.username)options.proxy.username=decodeURIComponent(proxy.username);
  if(proxy.password)options.proxy.password=decodeURIComponent(proxy.password);
 }
 const browser=await chromium.launch(options);
 const errors=[],failedRequests=[],consoleErrors=[];
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push({text:m.text(),location:m.location()});});
  page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname!=='/favicon.ico')failedRequests.push({url:r.url(),status:r.status()});});
  const response=await page.goto(target.href,{waitUntil:'load',timeout:60000});assert.equal(response.status(),200);await page.waitForFunction(()=>window.roomReady);
  assert.equal(await page.locator('#scene').isVisible(),true);assert.equal(await page.evaluate(()=>!!document.querySelector('#scene').getContext('webgl2')),true);
  assert.match(await page.locator('aside').textContent(),/G2\.5 HOLD/);
  const deployment=await (await page.request.get(new URL('deployment.json',target.href).href)).json();
  const downloaded=await page.request.get(new URL('ROOM_G2_Play.html',target.href).href);assert.equal(downloaded.status(),200);
  const downloadedSha=require('node:crypto').createHash('sha256').update(await downloaded.body()).digest('hex');assert.equal(downloadedSha,deployment.playableSha256);
  const click=async id=>{await page.locator('#'+id).click();await page.waitForFunction(()=>!roomInspect().busy,{},{timeout:45000});};
  await click('reset');await click('rotate');assert.equal((await page.evaluate(()=>roomInspect())).state.turn,0);
  await click('move');assert.equal((await page.evaluate(()=>roomInspect())).state.node,'T');
  await click('view');await click('view');assert.equal((await page.evaluate(()=>roomInspect())).state.camera,0);
  const state=await page.evaluate(()=>roomInspect());
  await page.screenshot({path:path.join(out,'game.png'),fullPage:true});await page.locator('#scene').screenshot({path:path.join(out,'canvas.png')});
  await click('move');assert.equal((await page.evaluate(()=>roomInspect())).state.node,'F');await click('move');assert.equal((await page.evaluate(()=>roomInspect())).state.won,true);await click('replay');
  const final=await page.evaluate(()=>roomInspect());assert.deepEqual(final.state,{node:'S',turn:3,camera:1,won:false});assert.equal(final.busy,false);assert.deepEqual(final.player,[-3.5,0,1.4]);
  assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
  const optionalConsole=consoleErrors.filter(e=>e.location.url&&new URL(e.location.url).pathname==='/favicon.ico'&&e.text.includes('404'));
  assert.equal(consoleErrors.length,optionalConsole.length,'unexpected console error');
  const report={url:target.href,date:new Date().toISOString(),browser:browser.version(),kind:target.protocol==='https:'?'hosted URL browser validation':'LOCAL artifact preflight only; not online evidence',deployment,stateAtScreenshot:state,final,errors,failedRequests,optionalConsole,status:'PASS'};
  fs.writeFileSync(path.join(out,'smoke.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({url:target.href,error:e.message},null,2));console.error(e);process.exitCode=1;});
