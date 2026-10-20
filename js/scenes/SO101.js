import * as cg from '../render/core/cg.js';
import { stl } from '../render/core/stl.js';
import { ControllerBeam } from '../render/core/controllerInput.js';

// DIGITAL DOUBLE OF AN SO101 EDUCATIONAL ROBOT ARM

let motion = time => [         // EXAMPLE OF JOINT ANIMATION INPUT FOR THE ROBOT ARM
  .3 * Math.cos(time * 1.2),
  .3 * Math.sin(time * 1.3),
  .3 * Math.cos(time * 1.4),
  .3 * Math.sin(time * 1.5),
  .3 * Math.cos(time * 1.6),
  .2 * Math.sin(time * 1.7)
];

let cleanup = () => {};
const degrees = radians => Math.round(radians * 180 / Math.PI);
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const init = async model => {
   const printed = [1,.82,.12], motor = [.1,.1,.1];     // COLOR PALETTE FOR THE ROBOT PARTS

   // THE MESH OF EACH LINK IS THE NAME OF A FILE IN media/stl/SO101. EACH LINK'S xyz AND rpy ARE RELATIVE TO THAT LINK'S FRAME.

   const links = {
      base_link: [
         { stl: 'base_motor_holder_so101_v1'       , xyz: [-0.00636471, -0.0000994414, -0.0024], rpy: [1.5708, 0, 1.5708], color: printed },
         { stl: 'base_so101_v2'                    , xyz: [-0.00636471, 0, -0.0024], rpy: [1.5708, 0, 1.5708], color: printed },
         { stl: 'sts3215_03a_v1'                   , xyz: [0.0263353, 0, 0.0437], rpy: [0, 0, 0], color: motor },
         { stl: 'waveshare_mounting_plate_so101_v2', xyz: [-0.0309827, -0.000199441, 0.0474], rpy: [1.5708, 0, 1.5708], color: printed },
      ],
      shoulder_link: [
         { stl: 'sts3215_03a_v1'            , xyz: [-0.0303992, 0.000422241, -0.0417], rpy: [1.5708, 1.5708, 0], color: motor },
         { stl: 'motor_holder_so101_base_v1', xyz: [-0.0675992, -0.000177759, 0.0158499], rpy: [1.5708, -1.5708, 0], color: printed },
         { stl: 'rotation_pitch_so101_v1'   , xyz: [0.0122008, 0.0000222413, 0.0464], rpy: [-1.5708, 0, 0], color: printed },
      ],
      upper_arm_link: [
         { stl: 'sts3215_03a_v1'    , xyz: [-0.11257, -0.0155, 0.0187], rpy: [-3.14159, 0, -1.5708], color: motor },
         { stl: 'upper_arm_s0101_v1', xyz: [-0.065085, 0.012, 0.0182], rpy: [3.14159, 0, 0], color: printed },
      ],
      lower_arm_link: [
         { stl: 'under_arm_so101_v1'         , xyz: [-0.0648499, -0.032, 0.0182], rpy: [3.14159, 0, 0], color: printed },
         { stl: 'motor_holder_so101_wrist_v1', xyz: [-0.0648499, -0.032, 0.018], rpy: [-3.14159, 0, 0], color: printed },
         { stl: 'sts3215_03a_v1'             , xyz: [-0.1224, 0.0052, 0.0187], rpy: [-3.14159, 0, -3.14159], color: motor },
      ],
      wrist_link: [
         { stl: 'sts3215_03a_no_horn_v1'   , xyz: [0, -0.0424, 0.0306], rpy: [1.5708, 1.5708, 0], color: motor },
         { stl: 'wrist_roll_pitch_so101_v2', xyz: [0, -0.028, 0.0181], rpy: [-1.5708, -1.5708, 0], color: printed },
      ],
      gripper_link: [
         { stl: 'sts3215_03a_v1'              , xyz: [0.0077, 0.0001, -0.0234], rpy: [-1.5708, 0, 0], color: motor },
         { stl: 'wrist_roll_follower_so101_v1', xyz: [0, -0.000218214, 0.000949706], rpy: [-3.14159, 0, 0], color: printed },
      ],
      gripper_frame_link: [],
      moving_jaw_so101_v1_link: [
         { stl: 'moving_jaw_so101_v1', xyz: [0, 0, 0.0189], rpy: [0, 0, 0], color: printed },
      ],
   };

   const joints = [
      { name: 'shoulder_pan' , parent: 'robotBaseFrame', xyz: [ 0.0388353,  0          ,  0.0624   ], rpy: [ 3.14159, 0        , -3.14159], lo: -1.91986 , hi: 1.91986, link: 'shoulder_link'            },
      { name: 'shoulder_lift', parent: 'shoulder_pan'  , xyz: [-0.0303992, -0.0182778  , -0.0542   ], rpy: [-1.5708 ,-1.5708   ,  0      ], lo: -1.74533 , hi: 1.74533, link: 'upper_arm_link'           },
      { name: 'elbow_flex'   , parent: 'shoulder_lift' , xyz: [-0.11257  , -0.028      ,  0        ], rpy: [ 0      , 0        ,  1.5708 ], lo: -1.69    , hi: 1.69   , link: 'lower_arm_link'           },
      { name: 'wrist_flex'   , parent: 'elbow_flex'    , xyz: [-0.1349   ,  0.0052     ,  0        ], rpy: [ 0      , 0        , -1.5708 ], lo: -1.65806 , hi: 1.65806, link: 'wrist_link'               },
      { name: 'wrist_roll'   , parent: 'wrist_flex'    , xyz: [ 0        , -0.0611     ,  0.0181   ], rpy: [ 1.5708 , 0.0486795,  3.14159], lo: -2.74385 , hi: 2.84121, link: 'gripper_link'             },
      { name: 'gripper'      , parent: 'wrist_roll'    , xyz: [ 0.0202   ,  0.0188     , -0.0234   ], rpy: [ 1.5708 , 0        ,  0      ], lo: -0.174533, hi: 1.74533, link: 'moving_jaw_so101_v1_link' },
      { name: 'gripper_frame', parent: 'wrist_roll'    , xyz: [-0.0079   , -0.000218121, -0.0981274], rpy: [ 0      , 3.14159  ,  0      ], fixed: true,                link: 'gripper_frame_link'       },
   ];

   for (const meshList of Object.values(links))         // START LOADING THE ROBOT PARTS
      for (let mesh of meshList)
            stl('SO101/' + mesh.stl);

   let robotBaseFrame = model.add().move(-.1,1.5,0).turnX(-Math.PI/2);

   let node = {};                                        // CREATE THE KINEMATIC JOINT HIERARCHY
   node['robotBaseFrame'] = robotBaseFrame;
   for (let j of joints)
      node[j.name] = node[j.parent].add();

   // Sample the teacher's kinematic chain at joint limits and center values.
   // The result is a coarse visual envelope, not an inverse-kinematics solver.
   const armJoints = joints.slice(0, 5);
   const frameJoint = joints.find(j => j.name === 'gripper_frame');
   const sampledEnd = pose => {
      let transform = robotBaseFrame.getGlobalMatrix();
      armJoints.forEach((j, i) => {
         let z = j.rpy[2], y = j.rpy[1], x = j.rpy[0];
         if ([0, 2, 3].includes(i)) z += pose[i];
         else y += pose[i];
         transform = cg.mMultiply(transform, cg.mTranslate(j.xyz));
         transform = cg.mMultiply(transform, cg.mRotateZ(z));
         transform = cg.mMultiply(transform, cg.mRotateY(y));
         transform = cg.mMultiply(transform, cg.mRotateX(x));
      });
      return cg.mTransform(cg.mMultiply(transform, cg.mTranslate(frameJoint.xyz)), [0, 0, 0]);
   };
   const samples = [];
   const sampleLimits = (pose, index) => {
      if (index === armJoints.length) { samples.push(sampledEnd(pose)); return; }
      const j = armJoints[index];
      for (const value of [j.lo, 0, j.hi]) sampleLimits(pose.concat(value), index + 1);
   };
   sampleLimits([], 0);
   const base = robotBaseFrame.getGlobalPos();
   const reachRadius = Math.max(...samples.map(point => distance(base, point))) + .025;
   const ringRadius = Math.max(...samples.map(point => Math.hypot(point[0] - base[0], point[2] - base[2]))) + .025;
   const minReachY = Math.min(...samples.map(point => point[1])) - .04;
   const maxReachY = Math.max(...samples.map(point => point[1])) + .04;
   const withinReachEnvelope = point => distance(base, point) <= reachRadius &&
      point[1] >= minReachY && point[1] <= maxReachY;

   let angles = [0, 0, 0, 0, 0, 0];
   let selected = 0, auto = false, showAnnotations = true, alive = true;
   let targetIndex = 0, hovering = null, lastText = '', lastSampleTime = 0;
   const targetPresets = [
      sampledEnd([0, 0, 0, 0, 0]).map((v, i) => v + (i === 0 ? .05 : 0)),
      sampledEnd([.7, -.7, .5, -.5, .3]),
      [base[0] + reachRadius * 1.35, base[1], base[2]]
   ];
   let target = targetPresets[0].slice();
   const targetNode = model.add('sphere').move(target).scale(.035).color(.3, 1, .45).dull();
   const targetHalo = model.add('ringY').move(target[0], target[1] - .045, target[2])
      .scale(.07, .004, .07).color(.3, 1, .45).dull();

   const annotations = model.add();
   const flatText = (value, size, color) => {
      const text = annotations.add().textBox(value, size).color(color).dull();
      text.child(0).scale(1, 1, .001);
      return text;
   };
   annotations.add('square').move(-.82, 1.68, -.7).scale(.51, .38, 1).color(.012, .035, .05).dull();
   const heading = flatText('SO101 VISUALIZER', .055, [.4, .92, 1]);
   const info = [
      flatText('', .037, [1, 1, 1]),
      flatText('', .037, [1, 1, 1]),
      flatText('', .037, [1, 1, 1]),
      flatText('', .037, [1, 1, 1]),
      flatText('', .043, [.35, 1, .55])
   ];
   const jointLabels = joints.slice(0, 6).map((j, i) =>
      flatText(`${i + 1}: 0 DEG`, .032, [.9, .95, 1]));
   const targetLine = annotations.add('tubeZ').color(.35, 1, .5).dull();
   const trail = [];
   const trailNodes = Array.from({ length: 80 }, () => annotations.add('tubeZ').color(1, .55, .12).dull().scale(0));
   for (let i = 0; i < 48; i++) {
      const a = 2 * Math.PI * i / 48, b = 2 * Math.PI * (i + 1) / 48;
      const from = [base[0] + ringRadius * Math.cos(a), base[1] - .11, base[2] + ringRadius * Math.sin(a)];
      const to = [base[0] + ringRadius * Math.cos(b), base[1] - .11, base[2] + ringRadius * Math.sin(b)];
      annotations.add('tubeZ').color(.14, .58, 1).dull().identity().link(from, to, .0015);
   }

   const beam = new ControllerBeam(model, 'right');
   const controls = [
      { id: 'joint', x: -.72, label: 'JOINT' },
      { id: 'minus', x: -.43, label: '- ANGLE' },
      { id: 'plus', x: -.14, label: '+ ANGLE' },
      { id: 'target', x: .15, label: 'TARGET' },
      { id: 'auto', x: .44, label: 'AUTO' },
      { id: 'annotations', x: .73, label: 'LABELS' }
   ].map(button => {
      const meshName = `so101_control_${button.id}`;
      clay.defineTextMesh(meshName, button.label);
      return { ...button,
         node: model.add('square').move(button.x, 1.05, -.72).scale(.13, .05, 1).color(.08, .48, .64).dull(),
         text: model.add(meshName).color(1, 1, 1).dull()
      };
   });

   const desktop = document.createElement('section');
   desktop.setAttribute('aria-label', 'SO101 robot controls');
   desktop.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:10000;width:340px;max-height:75vh;overflow:auto;padding:14px;background:#102432ee;color:white;border:1px solid #5bbbd1;border-radius:10px;font:14px Arial,sans-serif';
   desktop.innerHTML = '<strong>SO101 VISUALIZER</strong><p>Move joints to inspect angles, distance and tool trail.</p><div data-sliders></div><p><button data-action="auto">Auto motion</button> <button data-action="annotations">Hide annotations</button> <button data-action="clear">Clear trail</button> <button data-action="target">Next target</button></p><p data-readout role="status"></p><p>Blue ring: approximate horizontal reach. Red target: outside sampled envelope.</p>';
   document.body.appendChild(desktop);
   const sliderBox = desktop.querySelector('[data-sliders]');
   const readout = desktop.querySelector('[data-readout]');
   const sliderInputs = joints.slice(0, 6).map((j, i) => {
      const row = document.createElement('label');
      row.style.cssText = 'display:block;margin:5px 0';
      const value = document.createElement('span');
      value.textContent = `${j.name}: 0°`;
      const slider = document.createElement('input');
      slider.type = 'range'; slider.min = String(degrees(j.lo)); slider.max = String(degrees(j.hi));
      slider.step = '1'; slider.value = '0'; slider.style.width = '100%';
      slider.oninput = () => { auto = false; angles[i] = Number(slider.value) * Math.PI / 180; };
      row.append(value, slider);
      sliderBox.appendChild(row);
      return { slider, value };
   });
   const refreshSliders = () => sliderInputs.forEach(({ slider, value }, i) => {
      const shown = degrees(angles[i]);
      if (slider.value !== String(shown)) {
         slider.value = String(shown);
         value.textContent = `${joints[i].name}: ${shown}°`;
      }
   });
   const action = id => {
      if (id === 'joint') selected = (selected + 1) % 6;
      if (id === 'minus' || id === 'plus') {
         auto = false;
         angles[selected] = clamp(angles[selected] + (id === 'plus' ? 1 : -1) * Math.PI / 18,
            joints[selected].lo, joints[selected].hi);
         refreshSliders();
      }
      if (id === 'target') {
         targetIndex = (targetIndex + 1) % targetPresets.length;
         target = targetPresets[targetIndex].slice();
      }
      if (id === 'auto') auto = !auto;
      if (id === 'annotations') {
         showAnnotations = !showAnnotations;
         desktop.querySelector('[data-action="annotations"]').textContent = showAnnotations ? 'Hide annotations' : 'Show annotations';
      }
      if (id === 'clear') trail.length = 0;
   };
   desktop.querySelectorAll('[data-action]').forEach(button => button.onclick = () => action(button.dataset.action));
   inputEvents.onPress = hand => { if (hand === 'right' && hovering) action(hovering); };
   cleanup = () => {
      alive = false;
      desktop.remove();
      inputEvents.onPress = () => {};
   };

   model.animate(() => {
      if (!alive) return;
      for(let mesh of links['base_link']) {             // CREATE THE ROBOT BASE
         let partName = 'SO101/' + mesh.stl;
         if (clay.formMesh(partName) && ! mesh.part)
            mesh.part = node['robotBaseFrame'].add(partName).move(mesh.xyz)
                                                            .turnZ(mesh.rpy[2])
                                                            .turnY(mesh.rpy[1])
                                                            .turnX(mesh.rpy[0])
                                                            .color(mesh.color);
      }

      for(let j of joints)                              // CREATE THE ALL THE OTHER ROBOT PARTS
      for(let mesh of links[j.link]) {
         let partName = 'SO101/' + mesh.stl;
         if (clay.formMesh(partName) && ! mesh.part)
            mesh.part = node[j.name].add(partName).move(mesh.xyz)
                                                  .turnZ(mesh.rpy[2])
                                                  .turnY(mesh.rpy[1])
                                                  .turnX(mesh.rpy[0])
                                                  .color(mesh.color);
      }

      if (auto) {
         const moving = motion(model.time);
         angles = moving.map((value, i) => clamp(value, joints[i].lo, joints[i].hi));
         refreshSliders();
      }
      const m = angles;

      let i = 0;                                        // ANIMATE THE ROBOT
      for (let j of joints) {
         let z = j.rpy[2], y = j.rpy[1], x = j.rpy[0];
         switch (i) {
         case 0: case 2: case 3: z += m[i]; break;
         case 1: case 4: case 5: y += m[i]; break;
         }
         node[j.name].identity().move(j.xyz).turnZ(z).turnY(y).turnX(x);
         i++;
      }

      const end = node.gripper_frame.getGlobalPos();
      const reachable = withinReachEnvelope(target);
      targetNode.identity().move(target).scale(.035).color(reachable ? [.3, 1, .45] : [1, .18, .12]);
      targetHalo.identity().move(target[0], target[1] - .045, target[2])
         .scale(.07, .004, .07).color(reachable ? [.3, 1, .45] : [1, .18, .12]);
      annotations.identity().scale(showAnnotations ? 1 : 0);
      targetLine.identity().link(end, target, .0018).color(reachable ? [.35, 1, .5] : [1, .2, .14]);

      if (!trail.length || (distance(end, trail[trail.length - 1]) > .006 && model.time - lastSampleTime > .05)) {
         trail.push(end.slice());
         if (trail.length > trailNodes.length + 1) trail.shift();
         lastSampleTime = model.time;
      }
      trailNodes.forEach((segment, n) => {
         if (n + 1 < trail.length) segment.identity().link(trail[n], trail[n + 1], .0025);
         else segment.identity().scale(0);
      });

      const labels = angles.map((angle, n) => `${n + 1}: ${degrees(angle)} DEG`);
      const separation = distance(end, target);
      const state = reachable ? 'TARGET IN REACH ENVELOPE' : 'OUT OF REACH';
      const display = `${labels.join('|')}|${separation.toFixed(2)}|${state}|${selected}`;
      if (display !== lastText) {
         jointLabels.forEach((label, n) => label.textBox(labels[n], .032));
         info[0].textBox(`J1 ${degrees(angles[0])}  J2 ${degrees(angles[1])}  J3 ${degrees(angles[2])} DEG`, .037);
         info[1].textBox(`J4 ${degrees(angles[3])}  J5 ${degrees(angles[4])}  J6 ${degrees(angles[5])} DEG`, .037);
         info[2].textBox(`TO TARGET: ${separation.toFixed(2)} M`, .037);
         info[3].textBox(`SELECTED: ${joints[selected].name.toUpperCase()}`, .037);
         info[4].textBox(state, .043).color(reachable ? [.35, 1, .55] : [1, .25, .2]);
         readout.textContent = `Tool to target: ${separation.toFixed(2)} m. ${state}. Selected: ${joints[selected].name}.`;
         sliderInputs.forEach(({ value }, n) => value.textContent = `${joints[n].name}: ${degrees(angles[n])}°`);
         lastText = display;
      }
      heading.identity().move(-.82, 1.98, -.68).scale(.48);
      info.forEach((label, n) => label.identity().move(-.82, 1.85 - .11 * n, -.68).scale(.48));
      jointLabels.forEach((label, n) => {
         const point = node[joints[n].name].getGlobalPos();
         label.identity().move(point[0] + (n % 2 ? .12 : -.12),
            point[1] + .04 + (n % 3) * .06, point[2] + .11).scale(.32);
      });
      beam.update();
      hovering = null;
      controls.forEach(button => {
         const hit = beam.hitRect(button.node.getGlobalMatrix()) !== null;
         if (hit) hovering = button.id;
         button.node.color(hit ? [1, .8, .25] : [.08, .48, .64]);
         button.text.identity().move(button.x - button.label.length * .0095, 1.05, -.70);
      });
   });
}

export const deinit = () => cleanup();
export const onReload = async (_scene, model) => { cleanup(); model.clear(); await init(model); };
