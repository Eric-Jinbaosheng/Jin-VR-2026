import { NEON_BUILDINGS } from './neon_city_buildings.js';

export const BOARD = { x: .35, z: .225 };
export const COLORS = ['#4de1ff', '#ff479e', '#ffc665', '#64efb4', '#a698ff'];
export const BUILDINGS = NEON_BUILDINGS.map(([x, z, w, d, h], i) => ({
   x, z, w, d, h, key: String((i + 1) % 10),
   name: ['Holo Market', 'Night Tower', 'Market Annex', 'Signal House', 'Canal Loft',
          'Fusion Lab', 'Reactor Annex', 'Power Exchange', 'Transit Hub', 'Switchyard'][i],
}));

export const mm = metres => Math.round(metres * 1000);
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const validNumber = (n, fallback) => Number.isFinite(n) ? n : fallback;

export function cleanBuilding(index, data = {}) {
   const base = BUILDINGS[index];
   const dimension = (value, fallback, min, max) =>
      clamp(mm(validNumber(value, fallback)), mm(min), mm(max)) / 1000;

   return {
      x: dimension(data.x, base.x, -BOARD.x + base.w, BOARD.x - base.w),
      z: dimension(data.z, base.z, -BOARD.z + base.d, BOARD.z - base.d),
      height: dimension(data.height, base.h, .05, .34),
      color: /^#[\da-f]{6}$/i.test(data.color) ? data.color : COLORS[index % 2 === 0 ? 1 : 0],
      name: typeof data.name === 'string' ? data.name.slice(0, 28) : base.name,
      note: typeof data.note === 'string' ? data.note.slice(0, 72) : '',
   };
}

export function readDesign(value) {
   if (value?.version !== 1 || !Array.isArray(value.buildings) ||
       value.buildings.length !== BUILDINGS.length || value.buildings.some(b => !b || typeof b !== 'object'))
      return null;
   return {
      version: 1,
      selected: Number.isInteger(value.selected) && BUILDINGS[value.selected] ? value.selected : 0,
      desk: clamp(validNumber(value.desk, .78), .50, 1.20),
      buildings: value.buildings.map((b, index) => cleanBuilding(index, b)),
   };
}

export const initialDesign = () => ({
   version: 1, selected: 0, desk: .78,
   buildings: BUILDINGS.map((_, index) => cleanBuilding(index)),
});

// Nearest ray intersection with the editable building volumes in city coordinates.
export function pickBuilding(origin, direction, buildings) {
   let nearest = Infinity;
   let result = null;
   buildings.forEach((b, index) => {
      const { w, d } = BUILDINGS[index];
      const lo = [b.x - w, .008, b.z - d];
      const hi = [b.x + w, b.height + .008, b.z + d];
      let enter = 0;
      let exit = nearest;
      for (let axis = 0; axis < 3; axis++) {
         if (Math.abs(direction[axis]) < 1e-8) {
            if (origin[axis] < lo[axis] || origin[axis] > hi[axis]) return;
            continue;
         }
         const a = (lo[axis] - origin[axis]) / direction[axis];
         const c = (hi[axis] - origin[axis]) / direction[axis];
         enter = Math.max(enter, Math.min(a, c));
         exit = Math.min(exit, Math.max(a, c));
         if (enter > exit) return;
      }
      if (enter < nearest) {
         nearest = enter;
         result = index;
      }
   });
   return result;
}
