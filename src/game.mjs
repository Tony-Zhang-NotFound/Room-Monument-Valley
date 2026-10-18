import {LEVEL_VERSION} from './level.mjs';
export const initial=()=>({node:'S',turn:3,camera:1,won:false});
export function valid(s){return !!s&&['S','T','F','G'].includes(s.node)&&Number.isInteger(s.turn)&&s.turn>=0&&s.turn<=3&&Number.isInteger(s.camera)&&s.camera>=0&&s.camera<=2&&typeof s.won==='boolean'&&s.won===(s.node==='G')&&(s.node==='S'||s.turn===0);}
export function decodeSave(raw){try{const e=JSON.parse(raw);return e?.schema===1&&e?.level===LEVEL_VERSION&&valid(e.state)?{...e.state}:null;}catch{return null;}}
export function encodeSave(state){if(!valid(state))throw Error('Invalid stable state');return JSON.stringify({schema:1,level:LEVEL_VERSION,state});}
export function transition(s,c){
 if(!valid(s))return {ok:false,reason:'状态无效，请重置。'};
 const next={...s};let kind=c.type;
 if(c.type==='ROTATE'){
  if(s.node!=='S')return {ok:false,reason:'请先返回地面的安全点，再旋转楼梯。'};
  next.turn=(s.turn+1)%4;
 }else if(c.type==='CAMERA'){
  if(!Number.isInteger(c.value)||c.value<0||c.value>2)return {ok:false,reason:'无效视角。'};
  if(s.camera===c.value)return {ok:false,reason:'已经在这个视角。'};
  next.camera=c.value;
 }else if(c.type==='MOVE'||c.type==='BACK'){
  const order=['S','T','F','G'],i=order.indexOf(s.node),target=order[i+(c.type==='MOVE'?1:-1)];
  if(!target)return {ok:false,reason:c.type==='MOVE'?'你已抵达光下的门。':'已经在起点。'};
  if((s.node==='S'||target==='S')&&s.turn!==0)return {ok:false,reason:'先转动楼梯，让梯顶朝向右侧的平台。'};
  if((s.node==='T'&&target==='F'||s.node==='F'&&target==='T')&&(s.turn!==0||s.camera!==0))return {ok:false,reason:'从另一个角度观察，让两个断开的边缘对齐。'};
  next.node=target;next.won=target==='G';kind='WALK';
 }else return {ok:false,reason:'未知操作。'};
 return {ok:true,kind,from:{...s},next};
}
export function createGame(restored=null){
 let state=valid(restored)?{...restored}:initial(),pending=null,serial=0;const history=[];
 return {
  get state(){return {...state};},get busy(){return pending!==null;},get undoCount(){return history.length;},
  begin(c){
   if(c.type==='RESET'){serial++;pending=null;history.length=0;state=initial();return {ok:true,immediate:true,state:{...state}};}
   if(pending)return {ok:false,reason:'请等待当前动作结束。'};
   if(c.type==='UNDO'){if(!history.length)return {ok:false,reason:'还没有可以撤销的操作。'};state=history.pop();serial++;return {ok:true,immediate:true,state:{...state}};}
   const result=transition(state,c);if(!result.ok)return result;
   pending={...result,token:++serial};return {...pending};
  },
  commit(token){if(!pending||pending.token!==token)return false;history.push({...state});if(history.length>40)history.shift();state={...pending.next};pending=null;return true;},
  cancel(){pending=null;serial++;return {...state};}
 };
}
