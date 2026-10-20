// The model returns data only. This module is the boundary between AI output and Clay.
export const WORKCELL = Object.freeze({
   counts: [5, 20, 50],
   shapes: ['cube', 'sphere', 'tubeY', 'coneY', 'pyramidY'],
   kinds: ['shelf', 'conveyor', 'robot', 'machine', 'workbench', 'crate', 'target', 'barrier', 'tank', 'light'],
   min: [-1.3, .84, -1.7],
   max: [1.3, 2.05, -.3]
});

const requestedCount = (description, singular, plural) => {
   const match = description.match(new RegExp(`(\\d+)\\s*(?:${plural}|${singular})\\b`, 'i'));
   return match ? Number(match[1]) : 0;
};

export const workcellPrompt = (description, count, zone, focus, existing = []) => {
   const boxes = requestedCount(description, 'box', 'boxes');
   const shelves = requestedCount(description, 'shelf', 'shelves');
   const quota = total => zone
      ? Math.floor(total * zone.index / zone.total) - Math.floor(total * (zone.index - 1) / zone.total)
      : total;
   return `Design a recognizable low-poly VR robot factory from basic geometry modules only.
User request: ${description}
${zone ? `This is section ${zone.index} of ${zone.total}. Make a distinct part of the requested scene. Keep every object's x center and extents within ${zone.xMin}..${zone.xMax}, and z center and extents within ${zone.zMin}..${zone.zMax}.` : ''}
${count === 5 ? 'Use five distinct large modules so this reads as a complete factory at a glance: a storage shelf, a conveyor, a compact robot arm, a machine or workbench, and a crate or target. If the user asks for more items than five, depict them symbolically within these five modules.' : ''}
${boxes && focus !== 'structures' && count >= boxes ? `This ${zone ? 'section' : 'scene'} should have ${focus === 'boxes' ? count : quota(boxes)} separate crate modules, each named "box N" or "crate N".` : ''}
${shelves && focus !== 'boxes' && count !== 5 ? `This ${zone ? 'section' : 'scene'} should depict ${Math.min(count, quota(shelves))} distinct shelf modules.` : ''}
${focus === 'structures' ? `Generate exactly ${shelves} shelf modules, plus ${count - shelves} distinct factory modules such as conveyor, robot, workbench, machine or target. Do not include any crate or box module.` : ''}
${focus === 'boxes' ? `Generate exactly ${count} separate crate modules. EVERY object must have kind "crate", shape "cube", and name box_1, box_2, etc. Do not include any shelf.` : ''}
${existing.length ? `These structures already exist; place boxes on or beside them where possible: ${JSON.stringify(existing)}` : ''}
Return ONLY JSON with keys "title" and "objects". Return exactly ${count} objects, each with keys "name", "kind", "shape", "position", "scale", "color".
Each object is a meaningful factory MODULE. kind must be one of: ${WORKCELL.kinds.join(', ')}. The renderer will construct each module from multiple simple primitives using your kind, position, scale and color. Shape controls one visible detail primitive. Do not return a prefab, mesh URL, code or markdown. No floor or room shell.
shape must be one of: ${WORKCELL.shapes.join(', ')}. position is the center [x,y,z] in meters. scale is [half-width,half-height,half-depth] in meters, because Clay primitives extend one unit each way. color is RGB [r,g,b] with components 0..1.
All geometry must fit above the platform: x extents -1.3..1.3, y extents .84..2.05, z extents -1.7..-.3. Use scale components .035..0.5. Large shelf, robot, conveyor and machine modules should be at least .13 wide and .12 deep when space allows. Put module bottoms at y=.85 or stack crates deliberately; avoid accidental solid intersections. Use a coordinated industrial palette with contrasting module colors. If ${count} objects cannot depict all requested items, preserve the exact ${count} JSON count and summarize what fits. Keep title under 60 characters and names under 36 characters.`;
};

const vec3 = (value, min, max) => Array.isArray(value) && value.length === 3 &&
   value.every(n => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max);

export const validateWorkcell = (raw, count) => {
   if (!Number.isInteger(count) || count < 1 || count > 50 || !raw || typeof raw !== 'object' ||
       !Array.isArray(raw.objects) || raw.objects.length !== count)
      throw new Error(`AI must return exactly ${count} objects`);
   if (typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 60)
      throw new Error('AI returned an invalid title');

   let adjustments = 0;
   const objects = raw.objects.map((item, index) => {
      if (!item || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 36 ||
          !WORKCELL.kinds.includes(item.kind) || !WORKCELL.shapes.includes(item.shape) || !vec3(item.position, -2, 2.5) ||
          !vec3(item.scale, .005, 1.3) || !vec3(item.color, 0, 1))
         throw new Error(`Object ${index + 1} has an invalid name, shape, position, size or color`);
      const maxScale = item.shape === 'cube' ? [1.3, .55, .7] : [.5, .5, .5];
      if (item.scale.some((v, axis) => v > maxScale[axis] + .15))
         throw new Error(`Object ${index + 1} is too large for the workcell`);
      const scale = item.scale.map((v, axis) => clamp(v, .025, maxScale[axis]));
      const position = item.position.slice();
      for (let axis = 0; axis < 3; axis++) {
         if (position[axis] - scale[axis] < WORKCELL.min[axis] - .2 ||
             position[axis] + scale[axis] > WORKCELL.max[axis] + .2)
            throw new Error(`Object ${index + 1} extends outside the workcell`);
         position[axis] = clamp(position[axis], WORKCELL.min[axis] + scale[axis],
            WORKCELL.max[axis] - scale[axis]);
      }
      if (scale.some((v, axis) => v !== item.scale[axis]) ||
          position.some((v, axis) => v !== item.position[axis])) adjustments++;
      return { name: item.name.trim(), kind: item.kind, shape: item.shape,
         position, scale, color: item.color.slice() };
   });
   return { title: raw.title.trim(), objects, adjustments };
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Diagnostic only: shelves, supports and stacked parts can overlap intentionally.
export const countSolidOverlaps = objects => {
   let overlaps = 0;
   for (let i = 0; i < objects.length; i++)
      for (let j = i + 1; j < objects.length; j++)
         if ([0, 1, 2].every(axis =>
            Math.abs(objects[i].position[axis] - objects[j].position[axis]) <
            objects[i].scale[axis] + objects[j].scale[axis] - .02))
            overlaps++;
   return overlaps;
};

const zones = [
   { xMin: -1.25, xMax: -.45, zMin: -1.65, zMax: -1.03 },
   { xMin: -.4, xMax: .4, zMin: -1.65, zMax: -1.03 },
   { xMin: .45, xMax: 1.25, zMin: -1.65, zMax: -1.03 },
   { xMin: -.82, xMax: -.02, zMin: -.97, zMax: -.35 },
   { xMin: .02, xMax: .82, zMin: -.97, zMax: -.35 }
];

// Fifty items are requested in five AI-generated sections to avoid long, truncated JSON.
export const requestWorkcell = async (askJson, description, count, onProgress = () => {}) => {
   if (!WORKCELL.counts.includes(count)) throw new Error('Unsupported object count');
   const boxes = requestedCount(description, 'box', 'boxes');
   const shelves = requestedCount(description, 'shelf', 'shelves');
   const splitWarehouse = count === 20 && boxes > 0 && boxes < count && shelves > 0 && shelves <= count - boxes;
   const batches = count === 50
      ? zones.map((zone, i) => ({ expected: 10, zone: { ...zone, index: i + 1, total: 5 } }))
      : splitWarehouse
         ? [{ expected: count - boxes, focus: 'structures' }, { expected: boxes, focus: 'boxes' }]
         : [{ expected: count }];
   const all = [];
   let title = '', adjustments = 0;
   for (let i = 0; i < batches.length; i++) {
      const { expected, zone, focus } = batches[i];
      let data;
      for (let attempt = 1; attempt <= 3; attempt++) {
         onProgress(`Asking AI for section ${i + 1}/${batches.length}, attempt ${attempt}...`);
         try {
            const focusedDescription = focus === 'structures'
               ? `Create ${shelves} shelves for a robot warehouse`
               : focus === 'boxes' ? `Create ${boxes} separate boxes for a robot warehouse` : description;
            data = validateWorkcell(await askJson(workcellPrompt(focusedDescription, expected, zone, focus,
               focus === 'boxes' ? all : [])), expected);
            if (count === 5) {
               const kinds = new Set(data.objects.map(item => item.kind));
               if (!kinds.has('shelf') || !kinds.has('conveyor') || !kinds.has('robot') ||
                   !['machine', 'workbench'].some(kind => kinds.has(kind)) ||
                   !['crate', 'target'].some(kind => kinds.has(kind)))
                  throw new Error('AI did not produce a complete five-module factory');
            }
            if (focus === 'boxes' && data.objects.some(item =>
               item.kind !== 'crate' || item.shape !== 'cube' || !/box|crate/i.test(item.name)))
               throw new Error('AI did not return separate box primitives');
            if (focus === 'structures' && data.objects.some(item => item.kind === 'crate' || /box|crate/i.test(item.name)))
               throw new Error('AI mixed boxes into the shelf section');
            if (focus === 'structures' && data.objects.filter(item => item.kind === 'shelf').length !== shelves)
               throw new Error(`AI did not return ${shelves} distinct shelves`);
            break;
         } catch (error) {
            if (attempt === 3) throw error;
         }
      }
      if (!title) title = data.title;
      adjustments += data.adjustments;
      all.push(...data.objects);
   }
   return { title, objects: all, adjustments };
};
