// Recreate the exact pre-art source in an external, new directory for comparison.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(process.argv[2]||'/tmp/room-quiet-before');
if(output===root||output.startsWith(root+path.sep))throw Error('Baseline output must be outside the source checkout');
fs.mkdirSync(output);
const commit='4ab193c52490b9cdd5094f577e39a83eeafb9917';
execFileSync('tar',['-x','-C',output],{input:execFileSync('git',['archive',commit],{cwd:root,maxBuffer:64*1024*1024})});
const main=path.join(output,'src/main.mjs');
fs.appendFileSync(main,'\nwindow.roomRenderStats=()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures});\n');
console.log(JSON.stringify({output,commit,change:'Read-only renderer.info seam only; original visuals and gameplay unchanged'}));
