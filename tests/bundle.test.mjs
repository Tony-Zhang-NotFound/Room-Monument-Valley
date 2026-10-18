import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('single-file deliverable embeds code and CSS without runtime file dependencies',()=>{
const html=fs.readFileSync(new URL('../ROOM_G2_Play.html',import.meta.url),'utf8');assert.ok(!/<script[^>]+src=/.test(html));assert.ok(!/<link[^>]+stylesheet/.test(html));const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,2);for(const s of scripts)new vm.Script(s[1]);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);const main=fs.readFileSync(new URL('../src/main.mjs',import.meta.url),'utf8');for(const m of main.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(m[1]),'missing control '+m[1]);
});
