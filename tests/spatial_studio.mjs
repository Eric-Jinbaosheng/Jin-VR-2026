import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const asModule = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const readScene = file => readFile(new URL('../js/scenes/' + file, import.meta.url), 'utf8');

const math = asModule(await readScene('neon_city_math.js'));
const geometry = asModule((await readScene('neon_city_buildings.js')).replace('./neon_city_math.js', math));
const { BUILDINGS, cleanBuilding, initialDesign, pickBuilding, readDesign } = await import(
   asModule((await readScene('spatial_studio_state.js')).replace('./neon_city_buildings.js', geometry))
);

const design = initialDesign();
assert.equal(design.buildings.length, 10);
assert.deepEqual(design.buildings.map((_, i) => BUILDINGS[i].key), [...'1234567890']);
assert.deepEqual(readDesign(JSON.parse(JSON.stringify(design))), design);
assert.equal(readDesign({ version: 2, buildings: design.buildings }), null);
assert.equal(readDesign({ version: 1, buildings: [null, ...design.buildings.slice(1)] }), null);

const clamped = cleanBuilding(0, { x: 5, z: -5, height: 5, color: 'invalid' });
assert.deepEqual(clamped, { x: .305, z: -.185, height: .34, color: design.buildings[0].color,
   name: BUILDINGS[0].name, note: '' });

const first = design.buildings[0];
assert.equal(pickBuilding([first.x,.08,-.09], [0,0,-1], design.buildings), 0);
assert.equal(pickBuilding([1,.08,0], [0,0,-1], design.buildings), null);

const moved = design.buildings.slice();
moved[0] = cleanBuilding(0, { ...first, x: 0, z: -.13, height: .1 });
moved[1] = cleanBuilding(1, { ...moved[1], x: 0, z: .04, height: .22 });
assert.equal(pickBuilding([0,.09,.35], [0,0,-1], moved), 1);
assert.equal(pickBuilding([0,.19,-.13], [0,-1,0], moved), 0);
assert.equal(pickBuilding([0,.19,-.13], [0,1,0], moved), null);
console.log('PASS: ten keyboard slots, design round trip, board limits, moved geometry, and nearest gaze hit');
