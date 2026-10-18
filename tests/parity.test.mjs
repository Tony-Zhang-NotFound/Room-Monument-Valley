import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as extracted from '../src/game/game.mjs';
import * as current from '../src/game.mjs';
import * as level from '../src/game/level.mjs';
const html=fs.readFileSync(new URL('../baseline/ROOM_G2_Play.html',import.meta.url),'utf8');
const block=(name,next)=>html.slice(html.indexOf(`const __${name}=(()=>{`),html.indexOf(`const __${next}=(()=>{`));
const baseline=vm.runInNewContext(block('level','assets')+block('game','scene')+'({game:__game,level:__level})');
const plain=x=>JSON.parse(JSON.stringify(x));
const equal=(a,b)=>assert.deepEqual(plain(a),plain(b));
const commands=['ROTATE','MOVE','BACK','UNKNOWN'].map(type=>({type})).concat([-1,0,1,2,3,.5,null].map(value=>({type:'CAMERA',value})));
test('baseline oracle: exhaustive stable states and commands preserve transitions and saves',()=>{
 let states=0, comparisons=0;
 for(const node of ['S','T','F','G'])for(let turn=0;turn<4;turn++)for(let camera=0;camera<3;camera++)for(const won of [false,true]){
  const s={node,turn,camera,won};
  for(const api of [extracted,current]){
   equal(api.valid(s),baseline.game.valid(s));
   for(const c of commands){equal(api.transition(s,c),baseline.game.transition(s,c));comparisons++;}
   if(api.valid(s)){assert.equal(api.encodeSave(s),baseline.game.encodeSave(s));equal(api.decodeSave(api.encodeSave(s)),s);}
  }
  if(extracted.valid(s))states++;
 }
 assert.equal(states,21);assert.equal(comparisons,2112);
});
test('T01-T13/T15: explicit expectations on extracted core, pending and recovery',()=>{
 const g=extracted.createGame();equal(g.state,{node:'S',turn:3,camera:1,won:false});
 const run=c=>{const r=g.begin(c);assert.ok(r.ok);if(!r.immediate)assert.ok(g.commit(r.token));return r;};
 assert.equal(g.begin({type:'MOVE'}).ok,false);
 for(const turn of [0,1,2,3]){run({type:'ROTATE'});assert.equal(g.state.turn,turn);}
 run({type:'RESET'});run({type:'ROTATE'});
 const pending=g.begin({type:'MOVE'});assert.equal(g.state.node,'S');
 for(const value of [0,1,2])assert.equal(g.begin({type:'CAMERA',value}).ok,false);
 equal(extracted.createGame(extracted.decodeSave(extracted.encodeSave(g.state))).state,g.state);
 assert.ok(g.commit(pending.token));assert.equal(g.state.node,'T');assert.equal(g.begin({type:'ROTATE'}).ok,false);
 assert.equal(g.begin({type:'MOVE'}).ok,false);run({type:'CAMERA',value:2});assert.equal(g.begin({type:'MOVE'}).ok,false);
 run({type:'CAMERA',value:0});run({type:'MOVE'});run({type:'MOVE'});assert.ok(g.state.won);
 run({type:'UNDO'});assert.equal(g.state.node,'F');run({type:'RESET'});
 const stale=g.begin({type:'ROTATE'});run({type:'RESET'});assert.equal(g.commit(stale.token),false);
 for(const raw of ['bad','{}',JSON.stringify({schema:1,level:'old',state:g.state})]){assert.equal(extracted.decodeSave(raw),null);equal(extracted.createGame(extracted.decodeSave(raw)).state,extracted.initial());}
});
test('deterministic lifecycle parity: 10000 mixed commands, stale commits, cancel, reset, undo',()=>{
 const apis=[baseline.game,extracted,current],games=apis.map(a=>a.createGame());let seed=25025;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 const cmds=[...commands,{type:'RESET'},{type:'UNDO'}];let token=0;
 for(let i=0;i<10000;i++){
  const action=random()%5;let results;
  if(action<3){const c=cmds[random()%cmds.length];results=games.map(g=>g.begin(c));if(results[0].token)token=results[0].token;}
  else if(action===3){const t=random()%2?token:token-1;results=games.map(g=>g.commit(t));}
  else results=games.map(g=>g.cancel());
  equal(results[0],results[1]);equal(results[0],results[2]);
  for(const g of games.slice(1))equal([g.state,g.busy,g.undoCount],[games[0].state,games[0].busy,games[0].undoCount]);
 }
});
test('level constants and bidirectional routes are unchanged',()=>{
 for(const k of ['POS','VIEWS','MASK','SWEEP_RADIUS','LEVEL_VERSION'])equal(level[k],baseline.level[k]);
 for(const [a,b]of [['S','T'],['T','F'],['F','G'],['T','S'],['F','T'],['G','F']])for(const t of [0,.1,.5,.9,1])equal(level.samplePath(level.route(a,b),t),baseline.level.samplePath(baseline.level.route(a,b),t));
});
