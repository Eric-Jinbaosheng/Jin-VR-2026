/*****************************************************************

   This is the simplest "hello world" example:
   creating a single cube.

*****************************************************************/

export const init = async model => {
   let cube = model.add('cube');
   let sphere = model.add('sphere')
   model.move(0,1.5,0).scale(.3).animate(() => {
      cube.identity().turnY(model.time).scale(.5).color(1,0,0);
      sphere.identity().move(Math.cos(model.time) * 2,0,Math.sin(model.time) * 2).turnY(model.time*3).scale(1).color(0,1,0);
   });
}

