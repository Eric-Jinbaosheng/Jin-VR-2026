# HW3 — Two-Player Cooperative Carrying Task

**Scene:** `coop_carry` (`js/scenes/coop_carry.js`)

Open the same course server from two VR browsers and select `coop_carry` in both. Each participant aims the right controller beam at an available role and presses the right trigger. Player 1 takes the blue left handle; Player 2 takes the orange right handle. A taken role becomes unavailable to the other client.

Both players must press and hold the right trigger while their controller is near their own handle. The box stays locked until both handles are held. Player 1 computes box translation from the change in the midpoint of the two controller positions and sends the box position to Player 2. Carry the box to the green target to complete the task. Aim at **RESET TASK** and press the right trigger to restart the task without changing roles.

Role selection, hand positions, grab and release events, box movement, reset, and success use the course server's `server.send` / `server.sync` messages. A client leaving the scene or disconnecting releases its role; the remaining player must wait for a new partner. Both headsets need a shared spatial origin for the controller positions to line up with the box.

**Desktop test with one person:** Open `http://localhost:2026/hw3_test.html`. This puts two independent clients in one browser window, selects `coop_carry` and assigns Player 1 / Player 2 automatically. Click **同时抓取**, then move the slider to **1.50 m**; both clients should display success. Click **重置任务** to repeat. The page uses virtual right-hand positions and the same multiplayer messages as VR; physical controller behavior still needs a headset test.

---

# HW2 – Robot Calibration Challenge

## Overview

For Homework 2, I created a single-player VR game called **Robot Calibration Challenge**.

The player uses the right VR controller beam and trigger to calibrate five randomly selected targets on a seven-joint robot arm before a 30-second timer expires.

The game includes:

- In-game instructions
- Dynamic score and countdown timer
- Game status and current objective
- Explicit YOU WIN / YOU LOSE feedback
- Controller beam interaction
- Trigger input
- Vibrational feedback
- Hierarchical robot geometry
- Animated robot joints
- START and PLAY AGAIN controls

As more joints are successfully calibrated, the robot's malfunctioning motion gradually decreases. If all five required joints are calibrated before the timer expires, the player wins and the robot becomes stable.

## Controls

Point the **right controller beam** at START and press the right trigger to begin.

During the game, find the flashing calibration target, aim at it with the right controller, and press the trigger to calibrate that joint.

Calibrate 5 targets before the 30-second timer reaches zero.

After the game ends, point at PLAY AGAIN and press the trigger to restart.

---

# HW1 — VR Robotics Demonstration Collection

**Author:** Jin Baosheng  
**Course:** CSCI-GA.3033 Virtual Reality — Fall 2026  
**Homework:** HW1  
**Scene Name:** `robotics`  
**Main File:** `js/scenes/robot_data_collection.js`

---

# Overview

For HW1, I created an interactive VR scene inspired by **robotics teleoperation and demonstration data collection**.

The main idea is to use a VR controller as a simple human demonstration interface.

The user can:

- grab a virtual object with the controller,
- move the object through 3D space,
- release it onto a target,
- receive haptic feedback,
- interact with a reset button using a controller beam,
- observe an animated hierarchical robot arm,
- and record a simple manipulation trajectory.

This project combines the main VR interaction techniques introduced in class into one original scene.

The current project is not intended to be a complete robot control system. Instead, it explores how VR interaction can be used as the front end of a robotics data collection system.

---

# Demo Concept

The task is a simple **pick-and-place demonstration**.

```text
                    [ RESET ]
                        ^
                        |
                Controller Beam


    Robot Arm

       \
        \
         \          Red Cube             Target
          \             ■               [ GREEN ]


    =================================================
                       VR TABLE
```

The user performs the following interaction:

```text
Move controller near cube
          ↓
Press trigger
          ↓
Grab cube
          ↓
Move controller
          ↓
Cube follows controller
          ↓
Release trigger
          ↓
Check distance to target
          ↓
     Success / Failure
```

If the object is placed near the target successfully:

- the target changes color,
- the controller vibrates,
- the task is marked as successful.

---

# Features

This project combines the following concepts from class.

| Feature | Implementation |
|---|---|
| Controller press | Trigger press attempts to grab the cube |
| Controller drag | Cube follows the controller while trigger is held |
| Controller release | Cube is released and target success is checked |
| Multiplayer state | Object state is synchronized through the server |
| Haptic feedback | Vibration when grabbing, completing task, and resetting |
| Controller beam | Right controller beam interacts with RESET |
| Hierarchical animation | Robot → shoulder → elbow → gripper |
| Animation | Shoulder and elbow continuously move |
| VR object interaction | Pick-and-place task |
| Robotics data collection | Controller and object trajectories are recorded |

---

# Project Structure

The main files used for HW1 are:

```text
js/
└── scenes/
    ├── robot_data_collection.js
    └── scenes.js
```

## `robot_data_collection.js`

This is the main HW1 scene.

It contains:

- scene objects,
- robot hierarchy,
- controller interactions,
- grabbing,
- dragging,
- releasing,
- target detection,
- haptic feedback,
- controller beam interaction,
- reset logic,
- trajectory recording,
- multiplayer synchronization.

## `scenes.js`

The new scene is registered here:

```javascript
{
   name: "robotics",
   path: "./robot_data_collection.js",
   public: true
}
```

This makes the `robotics` scene appear in the scene selector.

---

# Scene State

The main shared scene state is stored inside:

```javascript
window.robotData = {
   objectXYZ: [-.25, 1.12, 0],
   rgb: [1, 0, 0],
   isHolding: false,
   taskSuccess: false,
};
```

This object stores information about the manipulable cube.

---

## `objectXYZ`

```javascript
objectXYZ: [-.25, 1.12, 0]
```

This stores the current position of the object:

```text
[x, y, z]
```

The cube uses this state when it is rendered:

```javascript
object.identity()
   .move(robotData.objectXYZ)
```

Therefore, instead of directly moving the visual cube inside every event handler, the interaction system changes the state.

The animation loop then renders the state.

The general idea is:

```text
Controller interaction
        ↓
Change robotData
        ↓
Animation loop reads robotData
        ↓
Scene updates
```

---

## `rgb`

```javascript
rgb: [1, 0, 0]
```

This controls the color of the cube.

Normally the cube is red:

```text
[1, 0, 0]
```

When the cube is successfully grabbed:

```javascript
robotData.rgb = [1, .5, 0];
```

The cube becomes orange.

This provides visual feedback that the object is currently selected.

---

## `isHolding`

```javascript
isHolding: false
```

This records whether the cube is currently being held.

Conceptually, this behaves like a very simple robotic gripper state:

```text
false → gripper open
true  → gripper closed
```

This value is also recorded as part of the trajectory data.

---

## `taskSuccess`

```javascript
taskSuccess: false
```

This records whether the cube was successfully placed on the target.

The target uses this value to determine its color.

---

# Helper Variables

Several other variables are used locally:

```javascript
let grabOffset = [0, 0, 0];

let targetXYZ = [.25, 1.06, 0];

let trajectory = [];
let isRecording = false;
let activeHand = null;
```

---

## `grabOffset`

`grabOffset` stores the relative position between the controller and the cube at the moment the object is grabbed.

This prevents the cube from suddenly teleporting to the exact center of the controller.

---

## `targetXYZ`

```javascript
let targetXYZ = [.25, 1.06, 0];
```

This is the center position of the target region.

It is used both for rendering the target and for checking whether the manipulation was successful.

---

## `trajectory`

```javascript
let trajectory = [];
```

This stores the recorded robotics-style demonstration.

Each frame can add a new sample to this array.

---

## `isRecording`

```javascript
let isRecording = false;
```

This determines whether the scene is currently recording a demonstration.

---

## `activeHand`

```javascript
let activeHand = null;
```

This remembers which VR controller is currently providing the demonstration.

---

# 3D Distance Function

The project uses a helper function:

```javascript
function distance(a,b){
   let dx = a[0] - b[0];
   let dy = a[1] - b[1];
   let dz = a[2] - b[2];

   return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
```

This computes Euclidean distance between two points.

Mathematically:

```text
distance = sqrt(dx² + dy² + dz²)
```

This function is used in two places.

First:

```text
controller ↔ cube
```

to determine whether the cube is close enough to grab.

Second:

```text
cube ↔ target
```

to determine whether the task was completed successfully.

---

# Creating the Scene

Inside:

```javascript
export const init = async model => {
```

the main scene objects are created.

```javascript
let table = model.add('cube');
let object = model.add('cube');
let target = model.add('cube');
```

The VR framework provides simple primitive shapes.

More complicated objects can be made by transforming these primitives.

Common functions include:

```javascript
.move()
.scale()
.color()
.turnX()
.turnY()
.turnZ()
```

---

# Table

The table is simply a cube scaled into a flat rectangular shape.

```javascript
table.identity()
   .move(0, 1, 0)
   .scale(.6, .05, .4)
   .color(.3, .3, .3);
```

The scale values correspond to:

```text
X → width
Y → thickness
Z → depth
```

Because Y is very small, the cube becomes a tabletop.

---

# Manipulation Object

The red cube is rendered using:

```javascript
object.identity()
   .move(robotData.objectXYZ)
   .scale(.06)
   .color(robotData.rgb);
```

The important point is that its position and color come from `robotData`.

This separates:

```text
STATE
```

from:

```text
RENDERING
```

The interaction system modifies the state, and the animation loop displays it.

---

# Target

The target is rendered using:

```javascript
target.identity()
   .move(targetXYZ)
   .scale(.12, .01, .12)
   .color(
      robotData.taskSuccess
         ? [1, 1, 0]
         : [0, 1, 0]
   );
```

It is normally green:

```text
[0, 1, 0]
```

After successful placement it becomes yellow:

```text
[1, 1, 0]
```

The expression:

```javascript
condition ? valueA : valueB
```

is a JavaScript conditional expression.

In this case:

```text
taskSuccess == true
        ↓
      yellow

taskSuccess == false
        ↓
       green
```

---

# Controller Press

Controller interaction starts with:

```javascript
inputEvents.onPress = hand => {
```

This event runs when the trigger is pressed.

The interaction contains two possible actions:

```text
Press
  |
  +------ pointing at RESET?
  |              |
  |             yes
  |              |
  |            Reset
  |
  +------ otherwise
                 |
             try to grab
```

---

# Reading Controller Position

The current controller position is obtained using:

```javascript
let handXYZ = inputEvents.pos(hand);
```

The result represents the controller position in 3D:

```text
[x, y, z]
```

The distance between the controller and cube is then calculated:

```javascript
let d = distance(
   handXYZ,
   robotData.objectXYZ
);
```

---

# Proximity-Based Grabbing

The cube can only be grabbed when:

```javascript
if (d < .15)
```

This means the controller must be within approximately 15 cm of the cube.

Without this condition, the cube could be grabbed from anywhere in the VR scene.

The interaction becomes:

```text
Press trigger
      ↓
Find controller position
      ↓
Find cube position
      ↓
Calculate distance
      ↓
Distance < 0.15?
   /          \
 yes          no
  |            |
grab       do nothing
```

---

# Grab Offset

When the cube is successfully grabbed:

```javascript
grabOffset = [
   robotData.objectXYZ[0] - handXYZ[0],
   robotData.objectXYZ[1] - handXYZ[1],
   robotData.objectXYZ[2] - handXYZ[2],
];
```

The reason for this is to prevent snapping.

Without an offset:

```text
Before grab:

Controller ●--------■ Cube


After press:

Controller ● Cube
```

The cube would instantly move to the controller center.

Instead, the program remembers:

```text
Cube position - Controller position
```

Then during dragging:

```text
New cube position =
New controller position
+
Original grab offset
```

So the relative grab position remains stable.

---

# Haptic Feedback

When the cube is successfully grabbed:

```javascript
vibrate(hand, .7, 50);
```

This produces a short controller vibration.

The parameters represent approximately:

```text
hand      → which controller
0.7       → vibration strength
50        → duration
```

This provides physical confirmation that the grab succeeded.

---

# Dragging

While the trigger remains pressed:

```javascript
inputEvents.onDrag = hand => {
```

the program checks:

```javascript
if (robotData.isHolding)
```

If the cube is currently held, the latest controller position is read:

```javascript
let handXYZ = inputEvents.pos(hand);
```

Then:

```javascript
robotData.objectXYZ = [
   handXYZ[0] + grabOffset[0],
   handXYZ[1] + grabOffset[1],
   handXYZ[2] + grabOffset[2],
];
```

Therefore:

```text
Controller moves
       ↓
New controller XYZ
       ↓
Add grab offset
       ↓
New cube XYZ
       ↓
Cube follows hand
```

---

# Releasing

When the trigger is released:

```javascript
inputEvents.onRelease = hand => {
```

the cube is marked as no longer held:

```javascript
robotData.isHolding = false;
```

and its color returns to red:

```javascript
robotData.rgb = [1, 0, 0];
```

---

# Success Detection

When the cube is released, the program calculates:

```javascript
let d = distance(
   robotData.objectXYZ,
   targetXYZ
);
```

If:

```javascript
d < .18
```

the task succeeds.

```javascript
robotData.taskSuccess = true;
```

A stronger vibration is generated:

```javascript
vibrate(hand, 1, 100);
```

Otherwise:

```javascript
robotData.taskSuccess = false;
```

This creates a simple pick-and-place objective.

---

# Multiplayer State Synchronization

The project uses the shared-state system provided by the course framework.

Whenever the local user changes the object:

```javascript
server.broadcastGlobal('robotData');
```

is called.

Inside the animation loop:

```javascript
robotData =
   server.synchronize('robotData');
```

is called every frame.

Conceptually:

```text
User A
  |
changes robotData
  |
broadcastGlobal()
  |
  v
Server
  |
  v
synchronize()
  |
  v
User B
```

This allows multiple clients to observe the same object state.

---

# Robotics Demonstration Recording

One experimental part of the project is trajectory recording.

When the user successfully grabs the cube:

```javascript
trajectory = [];
isRecording = true;
activeHand = hand;
```

A new demonstration begins.

---

# Recording Each Frame

Inside:

```javascript
model.animate(() => {
```

the project records data when:

```javascript
if (isRecording && activeHand)
```

The current controller position is retrieved:

```javascript
let handXYZ =
   inputEvents.pos(activeHand);
```

A trajectory sample is then added:

```javascript
trajectory.push({
   time: model.time,
   handXYZ: handXYZ.slice(),
   objectXYZ:
      robotData.objectXYZ.slice(),
   gripper:
      robotData.isHolding ? 1 : 0,
});
```

Each sample therefore contains:

```text
timestamp
controller XYZ
object XYZ
gripper state
```

For example:

```javascript
{
   time: 12.82,
   handXYZ: [
      0.10,
      1.25,
      -0.20
   ],
   objectXYZ: [
      0.05,
      1.20,
      -0.20
   ],
   gripper: 1
}
```

---

# Why `.slice()` Is Used

The project records:

```javascript
handXYZ.slice()
```

instead of:

```javascript
handXYZ
```

The same is done for:

```javascript
robotData.objectXYZ.slice()
```

This creates a copy of the array.

The goal is to preserve the position from that specific animation frame.

Otherwise, a trajectory sample could accidentally keep a reference to data that changes later.

---

# Ending Recording

When the object is released:

```javascript
isRecording = false;
activeHand = null;
```

Recording stops.

The trajectory is currently printed to the console:

```javascript
console.log(
   "Recorded trajectory:"
);

console.log(trajectory);

console.log(
   "Number of samples:",
   trajectory.length
);
```

This is currently an experimental feature.

The project does not yet save trajectories permanently to disk.

---

# Animated Robot Arm

Another major part of HW1 is hierarchical object animation.

The robot is built using:

```javascript
let robot = model.add();

let shoulder = robot.add();
let elbow = shoulder.add();
let gripper = elbow.add();
```

The hierarchy is therefore:

```text
robot
└── shoulder
    └── elbow
        └── gripper
```

This is similar to a simple robotics kinematic chain.

---

# Why Hierarchy Is Important

If the shoulder rotates:

```text
shoulder
   |
   +---- elbow
           |
           +---- gripper
```

the elbow and gripper automatically follow.

If the elbow rotates:

```text
shoulder
   |
   +---- elbow rotates
           |
           +---- gripper follows
```

the shoulder is not affected.

This is one of the main benefits of hierarchical transformations.

---

# Robot Base

The base is created using:

```javascript
robot.add('tubeY')
   .move(0, -.2, 0)
   .scale(.18, .2, .18)
   .color(.2, .2, .2);
```

Because the base is a child of the `robot` node, moving the robot root also moves the base.

---

# Shoulder

The shoulder joint is represented with:

```javascript
shoulder.add('sphere')
   .scale(.12)
   .color(.15, .15, .15);
```

The upper arm is:

```javascript
shoulder.add('tubeX')
   .move(.5, 0, 0)
   .scale(.5, .07, .07)
   .color(.2, .4, .1);
```

The center of the upper arm is placed at:

```text
x = 0.5
```

The elbow is later placed at:

```text
x = 1.0
```

So geometrically:

```text
shoulder                         elbow
    O-----------------------------O
                  ^
                0.5
```

---

# Elbow

The elbow joint is:

```javascript
elbow.add('sphere')
   .scale(.10)
   .color(.15, .15, .15);
```

The forearm is:

```javascript
elbow.add('tubeX')
   .move(.4, 0, 0)
   .scale(.4, .06, .06);
```

Because the forearm is a child of the elbow, rotating the elbow rotates both the forearm and gripper.

---

# Gripper

The gripper is created from two small cubes:

```javascript
gripper.add('cube')
   .move(.12, .08, 0)
   .scale(.12, .025, .04);

gripper.add('cube')
   .move(.12, -.08, 0)
   .scale(.12, .025, .04);
```

They form a simple two-finger shape.

```text
========

========
```

The gripper is currently visual only.

It does not physically manipulate the red cube.

---

# Robot Placement

The entire robot is positioned using:

```javascript
robot.identity()
   .move(-.45, 1.15, -.18)
   .scale(.3);
```

Because all robot parts are children of the robot root, this one transform moves and scales the entire structure.

---

# Shoulder Animation

The shoulder is animated using:

```javascript
shoulder.identity()
   .turnZ(
      -.15 +
      .15 * Math.sin(model.time)
   );
```

`Math.sin()` produces a smooth repeating value from:

```text
-1 to +1
```

Therefore the shoulder smoothly moves back and forth.

---

# Elbow Animation

The elbow is animated using:

```javascript
elbow.identity()
   .move(1, 0, 0)
   .turnZ(
      .7 +
      .2 *
      Math.sin(1.4 * model.time)
   );
```

The:

```javascript
.move(1, 0, 0)
```

places the elbow at the end of the upper arm.

The sine function then rotates the elbow.

The elbow uses a slightly different frequency from the shoulder, which makes the overall robot motion more interesting.

---

# Gripper Placement

The gripper uses:

```javascript
gripper.identity()
   .move(.8, 0, 0);
```

Because it is a child of the elbow, its final position automatically depends on:

```text
robot transform
+
shoulder transform
+
elbow transform
+
gripper transform
```

This is an example of hierarchical forward transformation.

---

# Why `identity()` Is Used

Most animated transforms start with:

```javascript
identity()
```

For example:

```javascript
elbow.identity()
   .move(...)
   .turnZ(...);
```

`identity()` resets the transformation before the current animation frame is calculated.

The process is approximately:

```text
Frame begins
   ↓
Reset transform
   ↓
Apply current position
   ↓
Apply current rotation
   ↓
Render
```

Without resetting, transformations could accumulate frame after frame.

---

# Controller Beam

The project imports:

```javascript
ControllerBeam
```

from the class input system.

A beam is created using:

```javascript
let beamR =
   new ControllerBeam(
      model,
      'right'
   );
```

The beam represents a ray extending from the right controller.

---

# Reset Button

The reset button is created using:

```javascript
let resetButton =
   model.add('square')
      .move(.5, 1.35, 0)
      .scale(.12, .06, 1)
      .color(1, 0, 0);
```

Its normal state is red.

---

# Beam Updating

Inside the animation loop:

```javascript
beamR.update();
```

updates the beam using the current right-controller pose.

---

# Beam Hit Testing

The program checks:

```javascript
let hit =
   beamR.hitRect(
      resetButton.getGlobalMatrix()
   );
```

`getGlobalMatrix()` returns the full transform of the reset button.

If the beam intersects it:

```javascript
resetHover = hit !== null;
```

becomes true.

---

# Reset Hover Feedback

The reset button uses:

```javascript
resetButton.color(
   resetHover
      ? [1, 1, 0]
      : [1, 0, 0]
);
```

Therefore:

```text
RED
=
not targeted

YELLOW
=
beam is pointing at RESET
```

---

# Reset Interaction

At the beginning of the press event:

```javascript
if (
   hand == 'right'
   &&
   resetHover
)
```

the task is reset.

```javascript
robotData.objectXYZ =
   [-.25, 1.12, 0];

robotData.rgb =
   [1, 0, 0];

robotData.isHolding =
   false;

robotData.taskSuccess =
   false;

grabOffset =
   [0, 0, 0];
```

The controller also vibrates:

```javascript
vibrate(hand, .7, 70);
```

Then:

```javascript
return;
```

prevents that same trigger press from continuing into the normal grab logic.

---

# Main Animation Loop

The continuous scene logic happens inside:

```javascript
model.animate(() => {
```

This loop runs once per rendered frame.

It performs the following operations:

```text
Synchronize shared state
        ↓
Record trajectory if needed
        ↓
Update table
        ↓
Update cube
        ↓
Update target
        ↓
Animate robot
        ↓
Update controller beam
        ↓
Perform beam hit test
        ↓
Update reset-button color
```

This is similar to an update loop in a traditional game engine.

---

# Robotics Interpretation

The robotics idea behind the scene is:

```text
Human
  ↓
VR controller
  ↓
Manipulation demonstration
  ↓
Trajectory
  ↓
Possible future robot policy
```

The controller acts conceptually like a simplified end-effector input device.

The current data contains:

```text
time
controller XYZ
object XYZ
gripper state
```

This is not yet a complete robot dataset.

---

# 6-DoF and Robot Joint Angles

A future version could record the full VR controller pose.

Instead of only:

```text
x
y
z
```

it could also record orientation:

```text
qx
qy
qz
qw
```

giving a full six-degree-of-freedom pose.

However:

```text
6-DoF controller pose
```

is not the same thing as:

```text
six robot joint angles
```

For a physical robot, the pipeline would generally be:

```text
VR controller pose
        ↓
Desired end-effector pose
        ↓
Inverse Kinematics
        ↓
Robot joint angles
        ↓
Physical robot
```

Inverse kinematics is outside the scope of this homework.

---

# Relationship to Class Examples

This HW1 scene combines concepts from several examples provided in class.

---

## `simple.js`

The simple example introduced:

- scene initialization,
- adding objects,
- animation,
- transformations.

---

## `interact.js`

The interaction example introduced:

```javascript
inputEvents.onPress
inputEvents.onDrag
inputEvents.onRelease
```

and:

```javascript
server.broadcastGlobal()
server.synchronize()
```

These concepts were adapted into the pick-and-place interaction.

---

## `jointed.js`

The hierarchical animation example introduced parent-child nodes.

That idea became:

```text
robot
└── shoulder
    └── elbow
        └── gripper
```

---

## `beam.js`

The beam example introduced:

- controller beams,
- ray intersection,
- haptic vibration.

Those ideas were used to create the reset interface.

---

# Controls

| Action | Controller Input |
|---|---|
| Grab cube | Move controller close to cube and press index trigger |
| Move cube | Hold trigger and move controller |
| Release cube | Release trigger |
| Complete task | Release cube near green target |
| Reset task | Point right controller beam at RESET and press trigger |
| Grab feedback | Short vibration |
| Success feedback | Stronger vibration |

---

# Running the Project

Start the course server from the repository root:

```bash
./startserver
```

Then open:

```text
http://localhost:2026
```

Select:

```text
robotics
```

from the scene list.

---

# Running in VR

The Quest browser should connect to the same development server.

For example:

```text
http://<computer-ip>:2026
```

The browser must successfully enter the immersive XR session before controller interaction works.

The VR headset is required to fully test:

- controller tracking,
- trigger events,
- drag interaction,
- release interaction,
- haptics,
- controller beams.

---

# Debugging

The project can be debugged in two stages.

## Desktop Browser

The desktop browser is useful for checking:

- whether the scene loads,
- object placement,
- robot geometry,
- hierarchy,
- animation,
- JavaScript errors,
- target colors.

## Quest

The Quest is required for checking:

- controller input,
- grabbing,
- dragging,
- release events,
- haptic feedback,
- beam interaction.

The original class scenes:

```text
interact
beam
```

are also useful for determining whether a problem comes from the custom HW1 code or from the WebXR/controller setup.

---

# Current Limitations

This project intentionally keeps the robotics portion simple because the main purpose of HW1 is VR interaction.

## Simplified robot

The visible robot is not a real six-axis industrial manipulator.

Its main purpose is demonstrating object hierarchy.

## No inverse kinematics

The robot joints are animated rather than controlled by the VR controller.

## Position-only recording

The trajectory currently records XYZ position but not orientation.

## No persistent dataset

Trajectory data is currently printed to the browser console.

## No physics engine

The object follows the controller directly instead of using rigid-body physics.

## Hardware validation

The interaction code is implemented, but the final submission should include a complete Quest test of:

- grabbing,
- dragging,
- releasing,
- vibration,
- controller beam,
- reset interaction.

---

# Possible Future Work

Possible extensions include:

- record full 6-DoF controller pose,
- export trajectories to JSON,
- replay recorded trajectories,
- visualize trajectory paths,
- add a ghost controller,
- add multiple demonstration episodes,
- add multiple cubes and targets,
- build a six-joint robot visualization,
- implement inverse kinematics,
- connect to a physical robot,
- add obstacle avoidance,
- collect success/failure labels,
- compare demonstrations between users.

---

# What I Learned

This assignment helped me understand several important ideas.

## State vs Rendering

I learned that it is useful to separate data from visual representation.

For example:

```javascript
robotData.objectXYZ
```

stores the position.

Then:

```javascript
object.move(
   robotData.objectXYZ
);
```

renders the position.

---

## Event-Based VR Interaction

VR controller interaction is not just a single click.

It has a lifecycle:

```text
press
  ↓
drag
  ↓
drag
  ↓
drag
  ↓
release
```

This makes VR manipulation different from normal mouse input.

---

## Hierarchical Transforms

The robot helped me understand why parent-child transformations are useful.

For example:

```text
shoulder
   ↓
elbow
   ↓
gripper
```

means the elbow automatically inherits shoulder motion.

---

## Haptic Feedback

Vibration can communicate important interaction state without relying only on visual feedback.

---

## Controller Beams

Controller beams provide a useful way to interact with UI elements that are not physically close to the user.

---

## VR for Robotics Data Collection

The project also showed how a VR controller can act as a demonstration input device.

Even a simple trajectory can contain structured data such as:

```text
time
controller pose
object pose
gripper state
success
```

which could later be used by a robotics system.

---

# Demo

The final demonstration video should show:

1. the complete VR scene,
2. the animated robot arm,
3. the user approaching the cube,
4. grabbing the cube,
5. moving the cube,
6. releasing it on the target,
7. target success feedback,
8. controller vibration,
9. controller beam targeting RESET,
10. reset behavior.

A screenshot or video can be added here after final Quest testing.

---

# Summary

This HW1 project combines the main VR interaction techniques introduced in class:

```text
Press / Drag / Release
          +
Multiplayer State
          +
Haptic Feedback
          +
Animated Hierarchy
          +
Controller Beam
          +
Robotics-Inspired
Trajectory Collection
```

The final result is a small VR pick-and-place environment inspired by robot teleoperation and demonstration data collection.

The project focuses on learning how interactive VR scenes are structured while exploring how these same interaction techniques could later be extended toward robotics applications.
