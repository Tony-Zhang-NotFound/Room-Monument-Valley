import fs from 'node:fs';import {POS,MASK,SWEEP_RADIUS} from '../src/level.mjs';
const scale=40,ox=250,oy=300,sx=x=>ox+x*scale,sz=z=>oy+z*scale;
const label=(x,y,s,color='#38443f')=>`<text x="${x}" y="${y}" fill="${color}" font-size="16">${s}</text>`;
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#eeeee7"/><g font-family="Arial, sans-serif"><text x="55" y="65" font-size="32" fill="#38443f">ROOM / G2 SPATIAL CONTRACT</text>${label(55,100,'Metres / Y-up / schematic plan and section')}${label(55,160,'PLAN  X-Z')}${label(650,160,'SECTION  X-Y  (depth omitted)')}`;
svg+=`<rect x="${sx(-4.5)}" y="${sz(-3.4)}" width="432" height="272" fill="#d1d6cf"/><circle cx="${sx(0)}" cy="${sz(0)}" r="${SWEEP_RADIUS*scale}" fill="none" stroke="#a15d59" stroke-dasharray="6 5"/><rect x="${sx(0)}" y="${sz(-.6)}" width="106" height="48" fill="#a15d59"/><rect x="${sx(4.05)}" y="${sz(-.3)}" width="94" height="96" fill="#f8f7ef"/>`;
const route=['S','T','A','B','F','G'].map(n=>`${sx(POS[n][0])},${sz(POS[n][2])}`).join(' ');svg+=`<polyline points="${route}" fill="none" stroke="#5a7770" stroke-width="2" stroke-dasharray="4 4"/>`;
for(const [name,p]of Object.entries(POS)){svg+=`<circle cx="${sx(p[0])}" cy="${sz(p[2])}" r="4" fill="#38443f"/>`+label(sx(p[0])+5,sz(p[2])+(name==='A'?26:name==='F'?-16:-10),name);}
svg+=label(55,485,'Dashed circle: continuous rotation envelope R = 2.73 m');svg+=label(55,516,'S lies outside the envelope. Only S permits rotation.');
const xx=x=>835+x*30,yy=y=>430-y*55;
svg+=`<rect x="${xx(-4.5)}" y="${yy(0)}" width="324" height="12" fill="#b9bdbb"/>`;
for(let i=0;i<8;i++)svg+=`<rect x="${xx(i*.25)}" y="${yy((i+1)*.25)}" width="7.5" height="${(i+1)*.25*55}" fill="#a15d59"/>`;
svg+=`<rect x="${xx(2)}" y="${yy(2)}" width="19.5" height="10" fill="#a15d59"/><rect x="${xx(4.05)}" y="${yy(3.12)}" width="70.5" height="12" fill="#b9bdbb"/><line x1="${xx(POS.A[0])}" y1="${yy(POS.A[1])}" x2="${xx(POS.B[0])}" y2="${yy(POS.B[1])}" stroke="#5a7770" stroke-width="2" stroke-dasharray="5 4"/>`;
for(const n of ['S','T','A','B','G']){const p=POS[n];svg+=label(xx(p[0]),yy(p[1])-15,n);}
svg+=label(650,485,'A = (2.65, 2.00, 0.00)');svg+=label(650,516,'B = (4.05, 3.12, 1.40)');
svg+=`<rect x="55" y="575" width="1090" height="160" rx="10" fill="#e0e4db"/>${label(80,612,'Projection contract: B - A = (1.4, 1.12, 1.4) = 1.4 x (1, 0.8, 1)')}${label(80,648,'Only C0 aligns the authored edge. A solid screen hides the A-to-B depth transfer.')}${label(80,685,'Stable checkpoints: S / T / F / G. Browser and player validation remain pending.')}</g></svg>`;
fs.writeFileSync(new URL('../docs/PLAN_SECTION.svg',import.meta.url),svg);
