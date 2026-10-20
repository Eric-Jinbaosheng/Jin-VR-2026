// A small vocabulary of factory modules built only from Clay primitives.
// AI chooses the module, center, dimensions, primary shape and color.
const steel = [.10, .17, .21], dark = [.035, .075, .095];
const cyan = [.14, .83, .94], amber = [1, .67, .16], white = [.79, .92, .96];
const shade = (rgb, amount) => rgb.map(value => Math.max(0, Math.min(1, value * amount)));

export const buildFactoryModule = (root, item, index, detailed = true) => {
   const [sx, sy, sz] = item.scale;
   const group = root.add().move(item.position);
   const part = (shape, x, y, z, a, b, c, color) =>
      group.add(shape).move(x, y, z).scale(a, b, c).color(color).dull();
   const box = (x, y, z, a, b, c, color) => part('cube', x, y, z, a, b, c, color);
   const foot = -sy;
   const top = sy;
   const body = item.color;
   let update = () => {};

   if (item.kind === 'shelf') {
      for (const x of [-sx * .84, sx * .84])
         for (const z of [-sz * .78, sz * .78])
            box(x, 0, z, sx * .07, sy * .94, sz * .09, steel);
      for (const level of [-.72, -.07, .60]) {
         box(0, sy * level, 0, sx * .96, sy * .055, sz * .88, body);
         box(0, sy * level - sy * .09, sz * .82, sx * .96, sy * .025, sz * .045, amber);
      }
      if (detailed) for (const x of [-.48, 0, .48]) {
         box(x * sx, sy * .19, 0, sx * .18, sy * .18, sz * .55, x ? [.58,.33,.15] : cyan);
         box(x * sx, sy * .25, sz * .56, sx * .10, sy * .035, sz * .015, white);
      }
      part(item.shape, 0, top * .82, 0, sx * .15, sy * .08, sz * .17, amber);
   } else if (item.kind === 'conveyor') {
      for (const x of [-sx * .76, sx * .76])
         for (const z of [-sz * .68, sz * .68])
            box(x, foot + sy * .50, z, sx * .055, sy * .49, sz * .06, steel);
      box(0, sy * .08, 0, sx, sy * .15, sz * .83, body);
      box(0, sy * .26, 0, sx * .94, sy * .035, sz * .68, dark);
      for (const z of [-sz * .83, sz * .83])
         box(0, sy * .29, z, sx, sy * .075, sz * .10, amber);
      if (detailed) for (let i = 0; i < 7; i++)
         box(sx * (-.78 + i * .26), sy * .30, 0, sx * .018, sy * .012, sz * .67, [.22,.33,.37]);
      const cargo = part(item.shape, 0, sy * .45, 0, sx * .14, sy * .18, sz * .35, cyan);
      update = t => cargo.identity().move(sx * .72 * Math.sin(t * .85 + index), sy * .45, 0)
         .scale(sx * .14, sy * .18, sz * .35).color(cyan);
   } else if (item.kind === 'robot') {
      box(0, foot + sy * .13, 0, sx * .78, sy * .12, sz * .75, steel);
      part('tubeY', 0, foot + sy * .43, 0, sx * .33, sy * .32, sz * .33, body);
      part('tubeY', 0, foot + sy * .77, 0, sx * .37, sy * .09, sz * .37, dark);
      part(item.shape, 0, foot + sy * .83, sz * .31, sx * .14, sy * .09, sz * .09, amber);
      const shoulder = group.add().move(0, foot + sy * .84, 0);
      shoulder.add('sphere').scale(sx * .25, sy * .16, sz * .24).color(amber).dull();
      shoulder.add('cube').move(sx * .27, sy * .29, 0)
         .scale(sx * .13, sy * .40, sz * .14).color(body).dull();
      const elbow = shoulder.add().move(sx * .54, sy * .58, 0);
      elbow.add('sphere').scale(sx * .20, sy * .13, sz * .20).color(steel).dull();
      elbow.add('cube').move(sx * .20, -sy * .22, 0)
         .scale(sx * .28, sy * .11, sz * .12).color(body).dull();
      elbow.add('cube').move(sx * .48, -sy * .35, -sz * .10)
         .scale(sx * .055, sy * .17, sz * .04).color(white).dull();
      elbow.add('cube').move(sx * .48, -sy * .35, sz * .10)
         .scale(sx * .055, sy * .17, sz * .04).color(white).dull();
      update = t => {
         shoulder.identity().move(0, foot + sy * .84, 0).turnZ(.15 + .25 * Math.sin(t * .7 + index));
         elbow.identity().move(sx * .54, sy * .58, 0).turnZ(-.75 + .25 * Math.sin(t * .9 + index));
      };
   } else if (item.kind === 'machine') {
      box(0, foot + sy * .25, 0, sx * .94, sy * .24, sz * .86, steel);
      box(0, sy * .07, 0, sx * .87, sy * .48, sz * .81, body);
      box(0, sy * .58, 0, sx * .95, sy * .09, sz * .88, steel);
      box(0, sy * .14, sz * .83, sx * .44, sy * .28, sz * .025, dark);
      box(0, sy * .17, sz * .86, sx * .31, sy * .18, sz * .012, cyan);
      for (const x of [-.66, -.33, 0, .33, .66])
         box(x * sx, sy * .69, sz * .86, sx * .055, sy * .035, sz * .015, amber);
      part(item.shape, 0, top * .76, 0, sx * .17, sy * .14, sz * .17, amber);
   } else if (item.kind === 'workbench') {
      for (const x of [-sx * .79, sx * .79])
         for (const z of [-sz * .68, sz * .68])
            box(x, foot + sy * .48, z, sx * .065, sy * .47, sz * .07, steel);
      box(0, sy * .02, 0, sx, sy * .11, sz * .93, body);
      box(-sx * .36, sy * .42, -sz * .32, sx * .31, sy * .28, sz * .06, dark);
      box(-sx * .36, sy * .44, -sz * .25, sx * .23, sy * .19, sz * .012, cyan);
      box(sx * .47, sy * .15, 0, sx * .30, sy * .06, sz * .38, amber);
      part(item.shape, sx * .45, sy * .38, 0, sx * .12, sy * .18, sz * .17, steel);
   } else if (item.kind === 'crate') {
      box(0, 0, 0, sx * .94, sy * .96, sz * .94, body);
      for (const x of [-sx * .78, sx * .78])
         box(x, 0, sz * .95, sx * .08, sy * .96, sz * .035, shade(body, .62));
      box(0, sy * .76, sz * .95, sx * .84, sy * .075, sz * .035, shade(body, .62));
      box(0, -sy * .70, sz * .95, sx * .84, sy * .075, sz * .035, shade(body, .62));
      box(0, top * .96, 0, sx * .80, sy * .03, sz * .80, shade(body, 1.22));
      part(item.shape, 0, sy * .09, sz * .99, sx * .11, sy * .10, sz * .025, amber);
   } else if (item.kind === 'target') {
      box(0, foot + sy * .12, 0, sx, sy * .11, sz, steel);
      box(0, foot + sy * .25, 0, sx * .86, sy * .025, sz * .86, body);
      part('ringY', 0, foot + sy * .30, 0, sx * .62, sy * .03, sz * .62, cyan);
      part(item.shape, 0, foot + sy * .40, 0, sx * .20, sy * .07, sz * .20, white);
   } else if (item.kind === 'barrier') {
      for (const x of [-sx * .85, sx * .85])
         box(x, 0, 0, sx * .09, sy, sz * .19, body);
      box(0, sy * .28, 0, sx * .92, sy * .10, sz * .14, amber);
      box(0, -sy * .34, 0, sx * .92, sy * .10, sz * .14, amber);
      box(0, foot + sy * .10, 0, sx, sy * .07, sz * .58, steel);
      part(item.shape, 0, sy * .62, 0, sx * .13, sy * .12, sz * .18, cyan);
   } else if (item.kind === 'tank') {
      part('tubeY', 0, 0, 0, sx * .70, sy * .92, sz * .70, body);
      for (const y of [-sy * .72, sy * .70])
         part('tubeY', 0, y, 0, sx * .76, sy * .045, sz * .76, steel);
      part(item.shape, 0, top * .86, 0, sx * .22, sy * .13, sz * .22, amber);
      box(sx * .72, 0, 0, sx * .17, sy * .07, sz * .13, cyan);
   } else if (item.kind === 'light') {
      box(0, foot + sy * .10, 0, sx * .62, sy * .09, sz * .62, steel);
      part('tubeY', 0, 0, 0, sx * .16, sy * .87, sz * .16, body);
      part('sphere', 0, top * .78, 0, sx * .45, sy * .18, sz * .45, amber);
      part(item.shape, 0, top * .50, 0, sx * .35, sy * .07, sz * .35, dark);
   }

   const marker = group.add('ringY').move(0, foot + .015, 0).scale(0).color(cyan).dull();
   return {
      update,
      select: selected => marker.identity().move(0, foot + .015, 0)
         .scale(selected ? sx * 1.12 : 0, .006, selected ? sz * 1.12 : 0).color(cyan)
   };
};
