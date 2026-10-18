// Minimal deterministic bundler for this fixed module graph; no downloads.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let three=read('vendor/three.module.js');const tail=three.match(/export\s*\{([^}]+)\};\s*$/);if(!tail)throw Error('Unexpected Three module format');
const pairs=tail[1].split(',').map(s=>{const a=s.trim().split(/\s+as\s+/);return a.length===2?a[1]+':'+a[0]:a[0];});
three=three.slice(0,tail.index);let code=`'use strict';\nconst __three=(()=>{${three}\nreturn {${pairs.join(',')}};})();\n`;
const modules=[['level','src/level.mjs'],['assets','src/assets-source.js'],['game','src/game.mjs'],['scene','src/scene.mjs'],['main','src/main.mjs']];
const lookup={'../vendor/three.module.js':'__three','./assets-source.js':'__assets','./level.mjs':'__level','./game.mjs':'__game','./scene.mjs':'__scene'};
for(const [name,file]of modules){let s=read(file);const names=[...s.matchAll(/export\s+(?:const|let|function|class)\s+(\w+)/g)].map(m=>m[1]);s=s.replace(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g,(_,alias,p)=>{if(!lookup[p])throw Error(p);return `const ${alias}=${lookup[p]};`;}).replace(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?/g,(_,imports,p)=>{if(!lookup[p])throw Error(p);return `const {${imports}}=${lookup[p]};`;}).replace(/export\s+(?=(const|let|function|class)\s)/g,'');code+=`const __${name}=(()=>{\n${s}\nreturn {${names.join(',')}};})();\n`;}
let html=read('index.html').replace('<link rel="stylesheet" href="./src/style.css">',()=>`<style>${read('src/style.css')}</style>`).replace(/<script type="importmap">[\s\S]*?<\/script>/,'').replace('<script type="module" src="./src/main.mjs"></script>',()=>`<script>${code.replace(/<\/script/gi,'<\\/script')}</script>`);
fs.writeFileSync(path.join(root,'ROOM_G2_Play.html'),html);console.log('Standalone built:',Buffer.byteLength(html),'bytes');
