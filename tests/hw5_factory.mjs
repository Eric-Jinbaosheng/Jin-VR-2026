import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(new URL('../js/scenes/ai_workcell_factory.js', import.meta.url), 'utf8');
const { buildFactoryModule } = await import('data:text/javascript,' + encodeURIComponent(source));

class Node {
   constructor(shapes, shape = null) { this.shapes = shapes; this.children = []; if (shape) shapes.push(shape); }
   add(shape) { const child = new Node(this.shapes, shape); this.children.push(child); return child; }
   nChildren() { return this.children.length; }
   remove(index) { this.children.splice(index, 1); }
   move() { return this; }
   scale() { return this; }
   color() { return this; }
   dull() { return this; }
   identity() { return this; }
   turnZ() { return this; }
}

for (const kind of ['shelf', 'conveyor', 'robot', 'machine', 'workbench',
   'crate', 'target', 'barrier', 'tank', 'light']) {
   const shapes = [];
   const visual = buildFactoryModule(new Node(shapes), {
      name: kind, kind, shape: 'cube', position: [0, 1.1, -1],
      scale: [.2, .25, .18], color: [.4, .6, .8]
   }, 0);
   assert.ok(shapes.length > 3, `${kind} should use multiple primitives`);
   const before = shapes.length;
   visual.setDetails(['sphere', 'cube', 'coneY'].map(shape => ({ shape,
      position: [0, 0, .9], scale: [.12, .12, .12], color: [1, .5, .2] })));
   assert.equal(shapes.length, before + 3);
   visual.update(1);
   visual.select(true);
   visual.select(false);
}
console.log('All factory modules construct and animate from primitives');
