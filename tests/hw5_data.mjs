import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(new URL('../js/scenes/ai_workcell_data.js', import.meta.url), 'utf8');
const { validateWorkcell, requestWorkcell, validateFactoryDetails, requestFactoryDetails } =
   await import('data:text/javascript,' + encodeURIComponent(source));
const make = count => ({ title: 'Robot workcell', objects: Array.from({ length: count }, (_, i) => ({
   name: `Part ${i + 1}`, kind: 'crate', shape: 'cube',
   position: [-1.1 + (i % 10) * .22, 1, -1.5 + Math.floor(i / 10) * .22],
   scale: [.04, .04, .04], color: [.2, .5, .8]
})) });

for (const count of [5, 20, 50]) assert.equal(validateWorkcell(make(count), count).objects.length, count);
for (const change of [
   data => data.objects[0].shape = 'mesh',
   data => data.objects[0].kind = 'spaceship',
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
   data.objects.forEach((item, i) => {
      item.name = warehouseCalls === 1 && i < 3 ? `shelf_${i + 1}` :
         warehouseCalls === 1 ? `machine_${i + 1}` : `box_${i + 1}`;
      item.kind = warehouseCalls === 1 ? (i < 3 ? 'shelf' : 'machine') : 'crate';
   });
   assert.match(prompt, warehouseCalls === 1 ? /factory modules/ : /EVERY object/);
   return data;
}, 'Generate a robot warehouse with 3 shelves and 10 boxes', 20);
assert.equal(warehouseCalls, 2);
assert.equal(warehouse.objects.filter(item => item.kind === 'shelf').length, 3);
assert.equal(warehouse.objects.filter(item => /box/i.test(item.name)).length, 10);
let fiveCalls = 0;
const five = await requestWorkcell(async () => {
   fiveCalls++;
   const data = make(5);
   if (fiveCalls > 1) data.objects.forEach((item, i) =>
      item.kind = ['shelf', 'conveyor', 'robot', 'machine', 'crate'][i]);
   return data;
}, 'Create a small robot factory', 5);
assert.equal(fiveCalls, 2);
assert.equal(five.objects.length, 5);
const detailResponse = { details: ['sphere', 'cube', 'coneY'].map((shape, i) => ({
   name: `Useful feature ${i + 1}`, shape, position: [0, .2 * i, .9],
   scale: [.12, .12, .12], color: [1, .5, .2]
})) };
assert.equal(validateFactoryDetails(detailResponse).length, 3);
const badDetails = structuredClone(detailResponse);
badDetails.details[0].position[2] = -.5;
assert.throws(() => validateFactoryDetails(badDetails));
let detailCalls = 0;
const details = await requestFactoryDetails(async prompt => {
   detailCalls++;
   assert.match(prompt, /Selected module/);
   return detailCalls === 1 ? badDetails : detailResponse;
}, five.objects[0]);
assert.equal(detailCalls, 2);
assert.equal(details.length, 3);
console.log('HW5 module, detail, and batching validation passed');
