// The AI chooses a mission, while this module keeps every generated object playable.
export const LAB = Object.freeze({
   xMin: -.65, xMax: .65, zMin: -.95, zMax: -.38,
   partY: 1.14, targetY: 1.055, snapRadius: .13
});

export const countForDifficulty = difficulty => ({ easy: 2, medium: 3, hard: 4 })[difficulty];

export const missionPrompt = difficulty => `Design one ${difficulty} robot assembly task for a standing player's WebXR workbench.
Return ONLY a JSON object with keys title, instruction, objects. Generate exactly ${countForDifficulty(difficulty)} objects.
Each object needs a unique id, shape, color, start, target, scale.
Shapes: cube, sphere, tubeY only. Give every part a clearly different color. Color is an RGB array of numbers from 0 to 1. Scale is three half-sizes, each 0.045 to 0.085 meters.
Start and target are [x,y,z] in meters. Choose unique starts from [-0.45,1.14,-0.8], [-0.22,1.14,-0.8], [-0.45,1.14,-0.53], [-0.22,1.14,-0.53]. Choose unique targets from [0.22,1.055,-0.8], [0.45,1.055,-0.8], [0.22,1.055,-0.53], [0.45,1.055,-0.53]. Permute the target assignments to make a fresh puzzle. Keep the task short and concrete. Make the title and instruction English and under 60 and 140 characters respectively. Avoid markdown.`;

const vector = (value, min, max) => Array.isArray(value) && value.length === 3 &&
   value.every((n, i) => typeof n === 'number' && Number.isFinite(n) && n >= min[i] && n <= max[i]);
const separation = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

export const validateMission = (raw, difficulty) => {
   const count = countForDifficulty(difficulty);
   if (!count || !raw || typeof raw !== 'object' || !Array.isArray(raw.objects) || raw.objects.length !== count)
      throw new Error(`AI must return exactly ${count || 0} parts`);
   const shortText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
   if (!shortText(raw.title, 60) || !shortText(raw.instruction, 140))
      throw new Error('AI returned an invalid title or instruction');

   const seen = new Set();
   const objects = raw.objects.map((part, i) => {
      if (!part || !shortText(part.id, 24) || !/^[a-zA-Z0-9_-]+$/.test(part.id) || seen.has(part.id))
         throw new Error(`Part ${i + 1} has an invalid or duplicate id`);
      seen.add(part.id);
      if (!['cube', 'sphere', 'tubeY'].includes(part.shape) ||
          !vector(part.color, [0, 0, 0], [1, 1, 1]) ||
          !vector(part.scale, [.045, .045, .045], [.085, .085, .085]) ||
          !vector(part.start, [-.55, 1.10, -.85], [-.15, 1.18, -.48]) ||
          !vector(part.target, [.15, 1.02, -.85], [.55, 1.09, -.48]))
         throw new Error(`Part ${i + 1} has an unsupported shape, color, size, or position`);
      return {
         id: part.id, shape: part.shape,
         color: part.color.slice(), scale: part.scale.slice(),
         start: part.start.slice(), target: part.target.slice()
      };
   });
   for (let i = 0; i < objects.length; i++)
      for (let j = i + 1; j < objects.length; j++)
         if (separation(objects[i].start, objects[j].start) < .17 ||
             separation(objects[i].target, objects[j].target) < .17)
            throw new Error('AI placed parts or goals too close together');
         else if (Math.hypot(...objects[i].color.map((c, k) => c - objects[j].color[k])) < .35)
            throw new Error('AI chose colors that are too similar');
   return { title: raw.title.trim(), instruction: raw.instruction.trim(), objects };
};

export const reachesTarget = (position, target) =>
   separation(position, target) <= LAB.snapRadius && Math.abs(position[1] - LAB.partY) <= .18;
