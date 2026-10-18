export const LEVEL_VERSION='atrium-g2-02';
export const POS={S:[-3.5,0,1.4],T:[1.8,2,0],A:[2.65,2,0],B:[4.05,3.12,1.4],F:[4.05,3.12,.2],G:[5.7,3.12,.2]};
export const VIEWS=[[1,.8,1],[-1,.65,1],[0,.4,1]];
export const MASK={position:[4.45,4.14,1.8],size:[1,1.65,.18],rotationY:Math.PI/4};
export const SWEEP_RADIUS=2.73;
export function stairPath(){const p=[POS.S,[-.4,0,0],[0,0,0]];for(let i=0;i<8;i++){p.push([i*.25,(i+1)*.25,0],[i===7?POS.T[0]:(i+1)*.25,(i+1)*.25,0]);}return p;}
export function route(from,to){
 const routes={ST:stairPath(),TF:[POS.T,POS.A,POS.B,POS.F],FG:[POS.F,POS.G]};
 if(routes[from+to])return routes[from+to].map(p=>[...p]);
 if(routes[to+from])return routes[to+from].slice().reverse().map(p=>[...p]);
 throw Error('Unknown route '+from+to);
}
export function samplePath(points,t){
 const lengths=points.slice(1).map((p,i)=>Math.hypot(...p.map((v,j)=>v-points[i][j]))),total=lengths.reduce((a,b)=>a+b,0);
 let distance=Math.max(0,Math.min(1,t))*total;
 for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const k=lengths[i]?distance/lengths[i]:1;return points[i].map((v,j)=>v+(points[i+1][j]-v)*k);}distance-=lengths[i];}
 return [...points.at(-1)];
}
