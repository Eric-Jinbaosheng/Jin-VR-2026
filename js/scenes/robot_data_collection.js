import { ControllerBeam } from "../render/core/controllerInput.js";

/*
   This is a simple "hello world" example: A rotating cube.
*/
window.robotData = {
   objectXYZ: [- .25, 1.12, 0],
   rgb: [1, 0, 0],
   isHolding: false,
   taskSuccess: false,
};

let grabOffset = [0, 0, 0];

let targetXYZ = [.25, 1.06, 0];

let trajectory = [];
let isRecording = false;
let activeHand = null;

function distance(a,b){
   let dx = a[0] - b[0];
   let dy = a[1] - b[1];
   let dz = a[2] - b[2];

   return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export const init = async model =>{
   
   let table = model.add('cube');
   let object = model.add('cube');
   let target = model.add('cube');

   let resetButton = model.add('square')
      .move(.5, 1.35, 0)
      .scale(.12, .06, 1)
      .color(1, 0, 0);

   let beamR = new ControllerBeam(model, 'right');

   let resetHover = false;

   let robot = model.add();

   let shoulder = robot.add();
   let elbow = shoulder.add();
   let gripper = elbow.add();

   robot.add('tubeY')
      .move(0, -.2, 0)
      .scale(.18, .2, .18)
      .color(.2, .2, .2);

   shoulder.add('sphere')
      .scale(.12)
      .color(.15, .15, .15);

   shoulder.add('tubeX')
      .move(.5, 0, 0)
      .scale(.5, .07, .07)
      .color(.2, .4, .1);

   elbow.add('sphere')
      .scale(.10)
      .color(.15, .15, .15);

   elbow.add('tubeX')
      .move(.4, 0, 0)
      .scale(.4, .06, .06)
      .color(2, .7, 1);

   gripper.add('cube')
      .move(.12, .08, 0)
      .scale(.12, .025, .04)
      .color(.8, .8, .8);

   gripper.add('cube')
      .move(.12, -.08, 0)
      .scale(.12, .025, .04)
      .color(.8, .8, .8);

   inputEvents.onPress = hand => {

      if (hand == 'right' && resetHover){
         
         robotData.objectXYZ = [-.25, 1.12, 0];

         robotData.rgb = [1, 0, 0];

         robotData.isHolding = false;

         robotData.taskSuccess = false;

         grabOffset = [0, 0, 0];

         vibrate(hand, .7, 70);

         server.broadcastGlobal('robotData');

         return
      }

      let handXYZ = inputEvents.pos(hand);

      let d = distance(handXYZ, robotData.objectXYZ);

      if (d < .15){

         robotData.isHolding = true;

         grabOffset = [
            robotData.objectXYZ[0] - handXYZ[0],
            robotData.objectXYZ[1] - handXYZ[1],
            robotData.objectXYZ[2] - handXYZ[2],
         ];

         trajectory = [];
         isRecording = true;
         activeHand = hand;

         robotData.rgb = [1, .5, 0];

         vibrate(hand, .7, 50);

         server.broadcastGlobal('robotData');

      }

   };

   inputEvents.onDrag = hand => {

      if (robotData.isHolding){

         let handXYZ = inputEvents.pos(hand);

         robotData.objectXYZ = [
            handXYZ[0] + grabOffset[0],
            handXYZ[1] + grabOffset[1],
            handXYZ[2] + grabOffset[2],
         ];

         server.broadcastGlobal('robotData');

      }
   };

   inputEvents.onRelease = hand => {

      robotData.isHolding = false;

      robotData.rgb = [1, 0, 0];

      let d = distance(robotData.objectXYZ, targetXYZ);

      if (d < .18){

         robotData.taskSuccess = true;

         vibrate(hand, 1, 100);
      }
      else {
         robotData.taskSuccess = false;
      }

      isRecording = false;
      activeHand = null;

      console.log("Recorded trajectory:");
      console.log(trajectory);
      console.log("Number of samples:", trajectory.length);

      server.broadcastGlobal('robotData');
   };


   model.animate(() =>{

      robotData = server.synchronize('robotData');

      if (isRecording && activeHand) {
         
         let handXYZ = inputEvents.pos(activeHand);

         trajectory.push({
            time: model.time,
            handXYZ: handXYZ.slice(),
            objectXYZ: robotData.objectXYZ.slice(),
            gripper: robotData.isHolding ? 1 : 0,
         })
      }

      table.identity()
         .move(0, 1, 0)
         .scale(.6, .05, .4)
         .color(.3, .3, .3);

      object.identity()
         .move(robotData.objectXYZ)
         .scale(.06)
         .color(robotData.rgb);

      target.identity()
         .move(targetXYZ)
         .scale(.12, .01, .12)
         .color(robotData.taskSuccess ? [1, 1, 0] : [0, 1, 0]);

      robot.identity()
         .move(-.45, 1.15, -.18)
         .scale(.3);

      shoulder.identity()
         .turnZ(-.15 + .15 * Math.sin(model.time));
      
      elbow.identity()
         .move(1, 0, 0)
         .turnZ(.7 + .2 * Math.sin(1.4 * model.time));

      gripper.identity()
         .move(.8, 0, 0);

      beamR.update();
      
      let hit = beamR.hitRect(resetButton.getGlobalMatrix());

      resetHover = hit !==null;

      resetButton.color(
         resetHover ? [1, 1, 0] : [1, 0, 0]
      );

   });
}

