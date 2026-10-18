// Controller integration under DOM / WebGL doubles. This is NOT browser QA.
import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {pathToFileURL,fileURLToPath} from 'node:url';
const url=p=>new URL(p,import.meta.url).href;
const elements=new Map(),listeners={};let tick,now=0;
function el(id){if(!elements.has(id))elements.set(id,{id,hidden:id==='winPanel'||id==='pausePanel',disabled:false,checked:false,textContent:'',innerHTML:'',clientWidth:1000,clientHeight:800,tagName:'DIV',classList:{toggle(){}},addEventListener(type,fn){listeners[id+type]=fn;},getBoundingClientRect(){return {left:0,top:0,width:1000,height:800};},focus(){globalThis.document.activeElement=this;}});return elements.get(id);}
globalThis.document={getElementById:el,querySelectorAll:()=>[0,1,2,3].map(i=>el('step'+i)),addEventListener:(type,fn)=>listeners[type]=fn,activeElement:null,hidden:false};
globalThis.window={addEventListener:(type,fn)=>listeners[type]=fn};globalThis.devicePixelRatio=1;globalThis.matchMedia=()=>({matches:false});const stored=new Map();globalThis.localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
globalThis.__renderer=class{constructor(){this.shadowMap={};}setPixelRatio(){}setClearColor(){}setSize(){}setAnimationLoop(fn){tick=fn;}render(){}};
const threeShim='data:text/javascript;base64,'+Buffer.from(`export * from '${url('../vendor/three.module.js')}';export const WebGLRenderer=globalThis.__renderer;`).toString('base64');
let source=fs.readFileSync(fileURLToPath(url('../src/main.mjs')),'utf8').replace("'../vendor/three.module.js'",JSON.stringify(threeShim));
for(const file of ['game.mjs','scene.mjs','level.mjs'])source=source.replace(`'./${file}'`,JSON.stringify(url('../src/'+file)));
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function click(id){const x=el(id);assert.ok(!x.disabled,id+' is disabled');x.onclick();}
function frames(n){for(let i=0;i<n;i++){now+=16;tick(now);}}
test('controller runs forward, pauses mid-animation, wins, undoes, resets and saves',()=>{
 assert.equal(window.roomReady,true);assert.equal(el('move').disabled,true);click('rotate');assert.equal(window.roomInspect().busy,true);frames(60);assert.equal(window.roomInspect().state.turn,0);
 click('move');frames(90);click('pause');const p=window.roomInspect().player;frames(120);assert.deepEqual(window.roomInspect().player,p);click('resume');frames(300);assert.equal(window.roomInspect().state.node,'T');
 click('view');frames(50);click('view');frames(50);assert.equal(window.roomInspect().state.camera,0);click('move');frames(160);assert.equal(window.roomInspect().state.node,'F');click('move');frames(100);assert.equal(window.roomInspect().state.won,true);assert.equal(el('winPanel').hidden,false);
 click('inspect');click('undo');assert.equal(window.roomInspect().state.node,'F');click('reset');assert.equal(window.roomInspect().state.node,'S');assert.equal(window.roomInspect().state.turn,3);assert.equal(window.roomInspect().paused,false);
 const checkpoint=JSON.parse(stored.get('room.atrium.g2.02'));assert.equal(checkpoint.state.node,'S');assert.equal(checkpoint.state.turn,3);
});
test('reduced motion commits instantly; reset safely cancels live animation',()=>{el('reduced').checked=true;click('rotate');assert.equal(window.roomInspect().busy,false);assert.equal(window.roomInspect().state.turn,0);el('reduced').checked=false;click('move');frames(10);click('reset');frames(400);assert.equal(window.roomInspect().state.node,'S');assert.equal(window.roomInspect().busy,false);assert.deepEqual(window.roomInspect().player,[-3.5,0,1.4]);});
