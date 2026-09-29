/*
   Robot Calibration Challenge

   Use the right controller beam to calibrate five highlighted points on a
   malfunctioning robot arm before the thirty second timer expires.
*/

import { ControllerBeam } from "../render/core/controllerInput.js";

export const init = async model => {
   const READY = 'ready';
   const PLAYING = 'playing';
   const WON = 'won';
   const LOST = 'lost';

   const targetScore = 5;
   const jointCount = 7;
   const gameDuration = 30;

   let gameState = READY;
   let score = 0;
   let startTime = 0;
   let remainingTime = gameDuration;
   let currentStep = 0;
   let targetOrder = [0, 1, 2, 3, 4];
   let previousFirstTarget = -1;
   let targetHover = false;
   let actionHover = false;
   let calibrated = Array(jointCount).fill(false);

   // Fixed text is defined once. Dynamic meshes are redefined only when
   // their displayed value changes, never on every animation frame.

   clay.defineTextMesh('robotGameTitle', 'ROBOT CALIBRATION CHALLENGE');
   clay.defineTextMesh('robotGameSubtitle', 'CALIBRATE 5 OF 7 JOINTS - RANDOM ORDER');
   clay.defineTextMesh('robotGameInstructions', `\
FIND THE FLASHING JOINT TARGET
PRESS RIGHT TRIGGER TO CALIBRATE
FIX ALL 5 POINTS BEFORE TIME RUNS OUT`);
   clay.defineTextMesh('robotGameGuideLabel', 'OPERATOR GUIDE');
   clay.defineTextMesh('robotGameStart', 'START');
   clay.defineTextMesh('robotGameRestart', 'PLAY AGAIN');
   clay.defineTextMesh('robotGameWin', 'YOU WIN!');
   clay.defineTextMesh('robotGameLose', 'YOU LOSE!');
   clay.defineTextMesh('robotGameScore', 'CALIBRATED: 0 / 5');
   clay.defineTextMesh('robotGameTime', 'TIME: 30');
   clay.defineTextMesh('robotGameStatus', 'STATUS: READY');
   clay.defineTextMesh('robotGameObjective', 'OBJECTIVE: START CALIBRATION');

   // textBox() uses a textured cubeXZ internally. Flatten its depth so VR
   // stereo rendering cannot reveal text repeated on the box's side faces.
   let makeFlatText = (text, height, color) => {
      let node = model.add().textBox(text, height).color(color).dull();
      node.child(0).scale(1, 1, .001);
      return node;
   };

   // Canvas text uses antialiased Arial instead of the angular line font or
   // the low-resolution label atlas. defineTextMesh() remains the backing
   // assignment text system, while these flat canvases are the visible layer.

   let titleText = makeFlatText('ROBOT CALIBRATION CHALLENGE', .06, [.2, .9, 1]);
   let subtitleText = makeFlatText('CALIBRATE 5 OF 7 JOINTS - RANDOM ORDER', .04, [.35, .62, .7]);
   let instructionText = [
      makeFlatText('FIND THE FLASHING TARGET', .05, [.7, .86, .92]),
      makeFlatText('AIM WITH RIGHT CONTROLLER', .05, [.7, .86, .92]),
      makeFlatText('PRESS TRIGGER TO CALIBRATE', .05, [.7, .86, .92]),
   ];
   let guideLabelText = makeFlatText('OPERATOR GUIDE', .075, [.2, .75, .9]);
   let scoreText = makeFlatText('CALIBRATED: 0 / 5', .07, [1, 1, 1]);
   let timeText = makeFlatText('TIME: 30', .11, [1, 1, 1]);
   let statusText = makeFlatText('STATUS: READY', .065, [1, .75, .1]);
   let objectiveText = makeFlatText('OBJECTIVE: START CALIBRATION', .045, [.35, .9, 1]);
   let startText = makeFlatText('START', .15, [.55, 1, 1]);
   let restartText = makeFlatText('PLAY AGAIN', .09, [.55, 1, 1]);
   let winText = makeFlatText('YOU WIN!', .12, [.3, 1, .45]);
   let loseText = makeFlatText('YOU LOSE!', .12, [1, .25, .18]);

   // Calibration console panels.

   model.add('square').move(0, 1.38, -.065).scale(.59, .55, 1).color(.008, .022, .045).dull();
   model.add('square').move(0, 1.82, -.055).scale(.56, .085, 1).color(.015, .10, .16).dull();
   model.add('square').move(-.31, 1.63, -.05).scale(.225, .062, 1).color(.025, .07, .11).dull();
   model.add('square').move( .31, 1.63, -.05).scale(.225, .062, 1).color(.025, .07, .11).dull();
   model.add('square').move(0, 1.50, -.05).scale(.225, .048, 1).color(.035, .075, .10).dull();
   model.add('square').move(-.20, 1.23, -.055).scale(.33, .20, 1).color(.012, .04, .065).dull();
   model.add('square').move( .36, 1.23, -.055).scale(.19, .20, 1).color(.018, .055, .085).dull();
   model.add('cube').move(0, .855, -.06).scale(.56, .008, .012).color(.05, .55, .75).dull();

   let statusLight = model.add('diskZ').color(1, .75, .1).dull();

   // The robot is the game board. Each marker is attached to an actual node
   // in its hierarchy, so the highlighted calibration point moves with the
   // corresponding joint.

   let robot = model.add();
   let joints = [];
   let parent = robot;
   let linkLengths = [.43, .38, .33, .27, .22, .17, .13];
   let jointAxisForms = ['tubeY', 'tubeZ', 'tubeX', 'tubeZ', 'tubeX', 'tubeZ', 'tubeX'];

   robot.add('tubeY').move(0, -.24, 0).scale(.19, .24, .19).color(.10, .12, .14).dull();
   robot.add('tubeY').move(0, -.46, 0).scale(.29, .055, .29).color(.68, .72, .74).dull();
   robot.add('tubeY').move(0, -.38, 0).scale(.23, .035, .23).color(.08, .62, .78).dull();

   for (let i = 0 ; i < 7 ; i++) {
      let joint = parent.add();
      joints.push(joint);

      joint.add('sphere').scale(.13 - .008 * i).color(.045, .065, .08).dull();
      let axisRadius = .15 - .008 * i;
      let axis = joint.add(jointAxisForms[i]).color(.08, i % 2 ? .48 : .62, i % 2 ? .62 : .78).dull();
      if (jointAxisForms[i] === 'tubeX')
         axis.scale(.065, axisRadius, axisRadius);
      else if (jointAxisForms[i] === 'tubeY')
         axis.scale(axisRadius, .065, axisRadius);
      else
         axis.scale(axisRadius, axisRadius, .065);

      joint.add('tubeX')
           .move(linkLengths[i] / 2, 0, 0)
           .scale(linkLengths[i] / 2, .068 - .004 * i, .068 - .004 * i)
           .color(.72, .76, .78)
           .dull();

      parent = joint;
   }

   let tool = joints[6].add();
   tool.add('cube').move(.035, 0, 0).scale(.075, .09, .075).color(.06, .09, .11).dull();
   tool.add('cube').move(.13, .075, 0).scale(.12, .024, .042).color(.65, .7, .72).dull();
   tool.add('cube').move(.13, -.075, 0).scale(.12, .024, .042).color(.65, .7, .72).dull();

   // Markers stay camera-facing for reliable beam intersection, but take
   // their world position from selected nodes in the seven-joint chain.

   let makeMarker = (name, source) => {
      let node = model.add('square').color(1, .18, .08).dull();
      node.add('square').move(0, 0, .02).scale(.58).color(.015, .04, .06).dull();
      node.add('square').move(0, 0, .04).scale(.20).color(1, 1, 1).dull();
      return { name: name, node: node, source: source };
   };

   let calibrationPoints = [
      makeMarker('J1 BASE', joints[0]),
      makeMarker('J2 SHOULDER', joints[1]),
      makeMarker('J3 ARM ROLL', joints[2]),
      makeMarker('J4 ELBOW', joints[3]),
      makeMarker('J5 FOREARM', joints[4]),
      makeMarker('J6 WRIST', joints[5]),
      makeMarker('J7 TOOL ROLL', joints[6]),
   ];

   // Generate a new five-of-seven sequence for every round. The first target
   // is forced to differ from the previous round so a restart is visibly new.

   let createTargetOrder = () => {
      let order = calibrationPoints.map((point, index) => index);
      for (let i = order.length - 1 ; i > 0 ; i--) {
         let j = Math.floor(Math.random() * (i + 1));
         let value = order[i];
         order[i] = order[j];
         order[j] = value;
      }

      let nextOrder = order.slice(0, targetScore);
      if (nextOrder[0] === previousFirstTarget) {
         let value = nextOrder[0];
         nextOrder[0] = nextOrder[1];
         nextOrder[1] = value;
      }
      previousFirstTarget = nextOrder[0];
      return nextOrder;
   };

   let lastDisplayedScore = score;
   let lastDisplayedTime = gameDuration;
   let lastDisplayedState = gameState;
   let lastDisplayedObjective = 'OBJECTIVE: START CALIBRATION';

   let objectiveString = () => {
      if (gameState === READY)
         return 'OBJECTIVE: START CALIBRATION';
      if (gameState === WON)
         return 'CALIBRATION COMPLETE';
      if (gameState === LOST)
         return 'ROBOT STILL OFFLINE';
      return `CALIBRATE: ${calibrationPoints[targetOrder[currentStep]].name}`;
   };

   let updateDynamicText = () => {
      let displayedTime = Math.ceil(remainingTime);
      let objective = objectiveString();

      if (score !== lastDisplayedScore) {
         let text = `CALIBRATED: ${score} / ${targetScore}`;
         clay.defineTextMesh('robotGameScore', text);
         scoreText.textBox(text, .07);
         lastDisplayedScore = score;
      }

      if (displayedTime !== lastDisplayedTime) {
         let text = `TIME: ${displayedTime}`;
         clay.defineTextMesh('robotGameTime', text);
         timeText.textBox(text, .11);
         lastDisplayedTime = displayedTime;
      }

      if (gameState !== lastDisplayedState) {
         let status = gameState === READY ? 'STATUS: READY'
                    : gameState === PLAYING ? 'STATUS: CALIBRATING'
                    : gameState === WON ? 'STATUS: ONLINE'
                    : 'STATUS: FAILED';
         clay.defineTextMesh('robotGameStatus', status);
         statusText.textBox(status, .065);
         lastDisplayedState = gameState;
      }

      if (objective !== lastDisplayedObjective) {
         clay.defineTextMesh('robotGameObjective', objective);
         objectiveText.textBox(objective, .045);
         lastDisplayedObjective = objective;
      }
   };

   let actionButton = model.add('square').color(.1, .85, 1).dull();
   actionButton.add('square').move(0, 0, .015).scale(.92, .70, 1).color(.012, .045, .07).dull();
   let beamR = new ControllerBeam(model, 'right');

   let resetGame = () => {
      gameState = READY;
      score = 0;
      startTime = model.time;
      remainingTime = gameDuration;
      currentStep = 0;
      targetHover = false;
      actionHover = false;
      calibrated.fill(false);
      updateDynamicText();
   };

   let startGame = () => {
      gameState = PLAYING;
      score = 0;
      startTime = model.time;
      remainingTime = gameDuration;
      currentStep = 0;
      targetOrder = createTargetOrder();
      targetHover = false;
      actionHover = false;
      calibrated.fill(false);
      updateDynamicText();
   };

   let registerCalibration = () => {
      if (gameState !== PLAYING)
         return;

      calibrated[targetOrder[currentStep]] = true;
      score++;
      vibrate('right', 1, 80);

      if (score >= targetScore) {
         gameState = WON;
         targetHover = false;
         vibrate('right', 1, 150);
      }
      else
         currentStep++;

      updateDynamicText();
   };

   inputEvents.onPress = hand => {
      if (hand !== 'right')
         return;

      if (gameState === READY && actionHover) {
         startGame();
         vibrate('right', .7, 60);
      }
      else if (gameState === PLAYING) {
         if (targetHover)
            registerCalibration();
         else
            vibrate('right', .2, 30);
      }
      else if ((gameState === WON || gameState === LOST) && actionHover) {
         resetGame();
         vibrate('right', .7, 60);
      }
   };

   model.animate(() => {
      beamR.update();

      if (gameState === PLAYING) {
         remainingTime = Math.max(0, gameDuration - (model.time - startTime));
         if (remainingTime <= 0) {
            gameState = score >= targetScore ? WON : LOST;
            targetHover = false;
         }
      }

      updateDynamicText();

      // Each successful calibration removes some of the arm's malfunctioning
      // jitter. Winning leaves it locked in a stable working pose.

      let instability = gameState === WON ? 0 : (targetScore - score) / targetScore;
      let desiredAngles = [-.38, 1.08, .48, -1.02, -.58, .78, .42];
      robot.identity().move(-.44, 1.10, -.02).scale(.29);

      for (let i = 0 ; i < joints.length ; i++) {
         let noise = instability * (.055 + .006 * i)
                   * Math.sin((4.3 + .65 * i) * model.time + 1.1 * i);
         joints[i].identity();
         if (i > 0)
            joints[i].move(linkLengths[i - 1], 0, 0);
         let angle = desiredAngles[i] + noise;
         if (jointAxisForms[i] === 'tubeX')
            joints[i].turnX(angle);
         else if (jointAxisForms[i] === 'tubeY')
            joints[i].turnY(angle);
         else
            joints[i].turnZ(angle);
      }
      tool.identity().move(linkLengths[6], 0, 0);

      let pulse = 1 + .10 * Math.sin(7 * model.time);
      for (let i = 0 ; i < calibrationPoints.length ; i++) {
         let point = calibrationPoints[i];
         let isActive = gameState === PLAYING && i === targetOrder[currentStep];
         let markerScale = isActive ? .060 * pulse : calibrated[i] ? .025 : 0;
         let sourceMatrix = point.source.getGlobalMatrix();
         let position = sourceMatrix.slice(12, 15);
         point.node.identity()
                   .move(position[0], position[1], position[2] + .02)
                   .scale(markerScale);
         point.node.color(calibrated[i] ? [.15, 1, .35] : [1, .18, .08]);
      }

      let actionVisible = gameState !== PLAYING;
      actionButton.identity()
                  .move(.36, 1.095, 0)
                  .scale(actionVisible ? .13 : 0, actionVisible ? .046 : 0, 1);

      // Only the active robot joint (or the state-dependent action button)
      // participates in controller beam intersection testing.

      targetHover = false;
      actionHover = false;

      if (gameState === PLAYING) {
         let activePoint = calibrationPoints[targetOrder[currentStep]];
         targetHover = beamR.hitRect(activePoint.node.getGlobalMatrix()) !== null;
         activePoint.node.color(targetHover ? [1, .9, .1] : [1, .18, .08]);
      }
      else
         actionHover = beamR.hitRect(actionButton.getGlobalMatrix()) !== null;

      actionButton.color(actionHover ? [1, .85, .15] : [.1, .85, 1]);

      let stateColor = gameState === WON ? [.25, 1, .45]
                     : gameState === LOST ? [1, .2, .15]
                     : gameState === PLAYING ? [.15, .9, 1]
                     : [1, .75, .1];
      statusLight.identity().move(-.14, 1.50, -.005).scale(.010).color(stateColor);
      statusText.color(stateColor);

      // Text layout.

      titleText.identity().move(0, 1.84, .01).scale(.34);
      subtitleText.identity().move(0, 1.785, .01).scale(.28);
      scoreText.identity().move(-.31, 1.63, .01).scale(.20);
      timeText.identity().move(.31, 1.63, .01).scale(.17);
      statusText.identity().move(0, 1.505, .01).scale(.20);
      objectiveText.identity().move(.36, 1.405, .01).scale(.18);
      guideLabelText.identity().move(.36, 1.355, .01).scale(.16);

      let showInstructions = gameState === READY || gameState === PLAYING;
      let instructionY = [1.305, 1.265, 1.225];
      for (let i = 0 ; i < instructionText.length ; i++)
         instructionText[i].identity()
                           .move(.36, instructionY[i], .01)
                           .scale(showInstructions ? .20 : 0);

      startText.identity()
               .move(.36, 1.10, .022)
               .scale(gameState === READY ? .13 : 0);
      restartText.identity()
                 .move(.36, 1.10, .022)
                 .scale(gameState === WON || gameState === LOST ? .13 : 0);

      winText.identity()
             .move(-.20, 1.23, .012)
             .scale(gameState === WON ? .25 : 0);
      loseText.identity()
              .move(-.20, 1.23, .012)
              .scale(gameState === LOST ? .23 : 0);
   });
};
