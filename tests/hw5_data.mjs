import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(new URL('../js/scenes/ai_workcell_data.js', import.meta.url), 'utf8');
const { validateWorkcell, requestWorkcell } =
   await import('data:text/javascript,' + encodeURIComponent(source));
const make = count => ({ title: 'Robot workcell', objects: Array.from({ length: count }, (_, i) => ({
   name: `Part ${i + 1}`, shape: 'cube',
   position: [-1.1 + (i % 10) * .22, 1, -1.5 + Math.floor(i / 10) * .22],
   scale: [.04, .04, .04], color: [.2, .5, .8]
})) });

for (const count of [5, 20, 50]) assert.equal(validateWorkcell(make(count), count).objects.length, count);
for (const change of [
   data => data.objects[0].shape = 'mesh',
   data => data.objects[0].scale = [0, .1, .1],
   data => data.objects[0].position = [2, 1, -1],
   data => data.objects.pop()
]) {
   const bad = make(5);
   change(bad);
   assert.throws(() => validateWorkcell(bad, 5));
}
const nearEdge = make(5);
nearEdge.objects[0].position[0] = -1.28;
assert.equal(validateWorkcell(nearEdge, 5).adjustments, 1);

let calls = 0;
const result = await requestWorkcell(async prompt => {
   calls++;
   assert.match(prompt, /section [1-5] of 5/);
   return make(10);
}, 'A robot warehouse', 50);
assert.equal(calls, 5);
assert.equal(result.objects.length, 50);
let warehouseCalls = 0;
const warehouse = await requestWorkcell(async prompt => {
   warehouseCalls++;
   const data = make(10);
   data.objects.forEach((item, i) => item.name = `${warehouseCalls === 1 ? 'shelf' : 'box'}_${i + 1}`);
   assert.match(prompt, warehouseCalls === 1 ? /structural components only/ : /EVERY object/);
   return data;
}, 'Generate a robot warehouse with 3 shelves and 10 boxes', 20);
assert.equal(warehouseCalls, 2);
assert.equal(warehouse.objects.filter(item => /box/i.test(item.name)).length, 10);
console.log('HW5 data validation and 50-object batching passed');
