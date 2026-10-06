/* HW3: two people carry one box by holding their assigned handles together. */

import { ControllerBeam } from "../render/core/controllerInput.js";

const CHANNEL = 'hw3CarryMessages';
const START_BOX = [0, 1.15, -.7];
const TARGET = [0, 1.15, -1.45];
const HANDLE_OFFSET = .38;
const GRAB_RADIUS = .18;
const GOAL_RADIUS = .24;
const ROLE = ['player1', 'player2'];
const COLORS = { player1: [.12, .52, 1], player2: [1, .48, .08] };

server.init(CHANNEL, {});

let leaveScene = () => {};

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const midpoint = (a, b) => a.map((value, i) => (value + b[i]) / 2);
const validPosition = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);

export const init = async model => {
   let myRole = null;
   let myHolding = false;
   let owners = { player1: null, player2: null };
   let claims = {};
   let hands = {};
   let boxXYZ = START_BOX.slice();
   let success = false;
   let carryStartMid = null;
   let carryStartBox = null;
   let lastHeartbeat = 0;
   let lastHandSend = 0;
   let lastBoxSend = 0;
   let hoveredRole = null;
   let resetHover = false;
   let active = true;
   let desktopHolding = false;
   let desktopHandXYZ = null;
   let desktopGrabStart = null;
   let desktopSlider = null;

   const myID = () => window.clientID;
   const send = message => server.send(CHANNEL, message);
   const claimOwner = role => {
      let ids = Object.keys(claims).filter(id => claims[id] === role &&
         window.clients && clients.some(client => String(client) === String(id)));
      return ids.sort((a, b) => Number(a) - Number(b))[0] ?? null;
   };
   const recalculateOwners = () => {
      owners.player1 = claimOwner('player1');
      owners.player2 = claimOwner('player2');
      if (myRole && String(owners[myRole]) !== String(myID())) {
         myRole = null;
         myHolding = false;
         desktopHolding = false;
      }
   };
   const currentHand = role => hands[owners[role]];
   const handlePosition = role => [
      boxXYZ[0] + (role === 'player1' ? -HANDLE_OFFSET : HANDLE_OFFSET),
      boxXYZ[1], boxXYZ[2]
   ];
   const resetTask = () => {
      boxXYZ = START_BOX.slice();
      success = false;
      carryStartMid = null;
      carryStartBox = null;
      myHolding = false;
      desktopHolding = false;
      desktopHandXYZ = null;
      if (desktopSlider) {
         desktopSlider.value = 0;
         desktopSlider.parentElement.querySelector('[data-distance]').value = '0.00';
      }
      Object.values(hands).forEach(hand => hand.holding = false);
      if (String(owners.player1) === String(myID()))
         send({ type: 'BOX', position: boxXYZ.slice(), success: false });
   };

   const makeText = (value, height, color) => {
      let node = model.add().textBox(value, height).color(color).dull();
      node.child(0).scale(1, 1, .001);
      return node;
   };
   const title = makeText('CO-OP CARRY', .10, [1, 1, 1]);
   const subtitle = makeText('SELECT YOUR PLAYER', .055, [.68, .85, 1]);
   const status = makeText('', .065, [1, 1, 1]);
   const identity = makeText('', .06, [1, 1, 1]);
   const p1Text = makeText('PLAYER 1 / LEFT', .055, COLORS.player1);
   const p2Text = makeText('PLAYER 2 / RIGHT', .055, COLORS.player2);
   const resetText = makeText('RESET TASK', .055, [1, 1, 1]);
   const targetText = makeText('TARGET', .06, [.3, 1, .4]);
   let displayed = { status: '', identity: '', p1: '', p2: '' };
   const setText = (node, key, value, height) => {
      if (displayed[key] !== value) {
         node.textBox(value, height);
         displayed[key] = value;
      }
   };

   const panel = model.add('square').color(.025, .055, .10).dull();
   const buttons = {
      player1: model.add('square').color(COLORS.player1).dull(),
      player2: model.add('square').color(COLORS.player2).dull()
   };
   const resetButton = model.add('square').color(.24, .35, .42).dull();
   const box = model.add();
   box.add('cube').scale(.30, .16, .18).color(.48, .56, .61).dull();
   box.add('cube').move(0, .16, 0).scale(.31, .018, .19).color(.17, .23, .28).dull();
   const handles = {
      player1: box.add('sphere').move(-HANDLE_OFFSET, 0, 0).scale(.075).color(COLORS.player1).dull(),
      player2: box.add('sphere').move(HANDLE_OFFSET, 0, 0).scale(.075).color(COLORS.player2).dull()
   };
   box.add('tubeX').move(-.34, 0, 0).scale(.08, .026, .026).color(COLORS.player1).dull();
   box.add('tubeX').move(.34, 0, 0).scale(.08, .026, .026).color(COLORS.player2).dull();
   const target = model.add('cube').move(TARGET[0], .91, TARGET[2])
      .scale(.32, .015, .32).color(.08, .70, .25).dull();
   const beam = new ControllerBeam(model, 'right');

   const selectRole = role => {
      if (myRole || owners[role] !== null || myID() === undefined)
         return;
      myRole = role;
      claims[myID()] = role;
      recalculateOwners();
      send({ type: 'PLAYER_SELECT', player: role });
   };

   const grab = position => {
      if (!myRole || myHolding || success || !owners.player1 || !owners.player2 ||
          !validPosition(position) || distance(position, handlePosition(myRole)) > GRAB_RADIUS)
         return false;
      myHolding = true;
      hands[myID()] = { position: position.slice(), holding: true };
      send({ type: 'GRAB', player: myRole, position: position.slice() });
      return true;
   };
   const release = () => {
      if (!myHolding) return;
      myHolding = false;
      desktopHolding = false;
      if (hands[myID()]) hands[myID()].holding = false;
      send({ type: 'RELEASE', player: myRole });
   };

   // Click-to-hold controls let one person operate two browser windows.
   // They send the same messages as the VR controller.
   const desktop = document.createElement('section');
   desktop.setAttribute('aria-label', 'Desktop co-op test controls');
   desktop.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:10000;width:260px;padding:14px;background:#102132;color:white;border:1px solid #5e8198;border-radius:10px;font:14px Arial,sans-serif;box-shadow:0 4px 20px #0008';
   desktop.innerHTML = '<strong>DESKTOP CO-OP TEST</strong><p style="margin:8px 0">Open this scene in two browser windows.</p><div style="display:flex;gap:8px"><button data-role="player1">Player 1 · Left</button><button data-role="player2">Player 2 · Right</button></div><p data-status style="min-height:36px;margin:10px 0"></p><button data-grab style="width:100%">Grab handle</button><label style="display:block;margin:12px 0 3px">Move toward target: <output data-distance>0.00</output> m</label><input data-move type="range" min="0" max="1.5" step="0.01" value="0" style="width:100%"><button data-reset style="margin-top:8px">Reset task</button>';
   document.body.appendChild(desktop);
   const roleButtons = ROLE.map(role => desktop.querySelector(`[data-role="${role}"]`));
   const grabButton = desktop.querySelector('[data-grab]');
   const resetTaskButton = desktop.querySelector('[data-reset]');
   const desktopStatus = desktop.querySelector('[data-status]');
   const distanceOutput = desktop.querySelector('[data-distance]');
   desktopSlider = desktop.querySelector('[data-move]');
   roleButtons.forEach((button, i) => button.onclick = () => selectRole(ROLE[i]));
   grabButton.onclick = () => {
      if (desktopHolding) {
         release();
         return;
      }
      if (!myRole) return;
      desktopSlider.value = 0;
      distanceOutput.value = '0.00';
      desktopGrabStart = handlePosition(myRole);
      desktopHandXYZ = desktopGrabStart.slice();
      desktopHolding = grab(desktopHandXYZ);
   };
   desktopSlider.oninput = () => {
      distanceOutput.value = Number(desktopSlider.value).toFixed(2);
      if (!desktopHolding) return;
      desktopHandXYZ = desktopGrabStart.slice();
      desktopHandXYZ[2] -= Number(desktopSlider.value);
      hands[myID()] = { position: desktopHandXYZ.slice(), holding: true };
      send({ type: 'HAND_MOVE', player: myRole, position: desktopHandXYZ.slice() });
   };
   resetTaskButton.onclick = () => {
      if (!myRole) return;
      resetTask();
      send({ type: 'RESET' });
   };

   inputEvents.onPress = hand => {
      if (hand !== 'right') return;
      if (!myRole) {
         if (hoveredRole) selectRole(hoveredRole);
         return;
      }
      if (resetHover) {
         resetTask();
         send({ type: 'RESET' });
         return;
      }
      grab(inputEvents.pos(hand));
   };
   inputEvents.onRelease = hand => {
      if (hand === 'right' && !desktopHolding) release();
   };

   leaveScene = () => {
      active = false;
      if (myRole) {
         send({ type: 'LEAVE', player: myRole });
         server.sync(CHANNEL, () => {});
      }
      inputEvents.onPress = () => {};
      inputEvents.onRelease = () => {};
      desktop.remove();
   };

   model.animate(() => {
      if (!active) return;
      server.sync(CHANNEL, (messages, sender) => {
         for (const message of Object.values(messages)) {
            if (!message || !window.clients || !clients.some(id => String(id) === String(sender)))
               continue;
            if (message.type === 'PLAYER_SELECT' && ROLE.includes(message.player))
               claims[sender] = message.player;
            else if (message.type === 'LEAVE') {
               delete claims[sender];
               delete hands[sender];
            }
            else if (message.type === 'RESET') resetTask();
            else if (message.type === 'GRAB' && validPosition(message.position))
               hands[sender] = { position: message.position, holding: true };
            else if (message.type === 'HAND_MOVE' && validPosition(message.position) && hands[sender])
               hands[sender].position = message.position;
            else if (message.type === 'RELEASE' && hands[sender])
               hands[sender].holding = false;
            else if (message.type === 'BOX' && validPosition(message.position) &&
                     String(sender) === String(owners.player1)) {
               boxXYZ = message.position;
               success = !!message.success;
            }
         }
      });
      for (const id of Object.keys(claims))
         if (!clients || !clients.some(client => String(client) === String(id))) {
            delete claims[id];
            delete hands[id];
         }
      recalculateOwners();

      const now = Date.now();
      if (myRole && now - lastHeartbeat > 1000) {
         send({ type: 'PLAYER_SELECT', player: myRole });
         lastHeartbeat = now;
      }
      if (myHolding && now - lastHandSend > 50) {
         const position = desktopHolding ? desktopHandXYZ : inputEvents.pos('right');
         if (validPosition(position)) {
            hands[myID()] = { position: position.slice(), holding: true };
            send({ type: 'HAND_MOVE', player: myRole, position: position.slice() });
            lastHandSend = now;
         }
      }

      const left = currentHand('player1');
      const right = currentHand('player2');
      const bothHolding = !!(left?.holding && right?.holding && owners.player1 && owners.player2);
      if (String(owners.player1) === String(myID()) && bothHolding && !success) {
         const mid = midpoint(left.position, right.position);
         if (!carryStartMid) {
            carryStartMid = mid;
            carryStartBox = boxXYZ.slice();
         }
         boxXYZ = carryStartBox.map((value, i) => value + mid[i] - carryStartMid[i]);
         if (distance(boxXYZ, TARGET) < GOAL_RADIUS) success = true;
         if (now - lastBoxSend > 50 || success) {
            send({ type: 'BOX', position: boxXYZ.slice(), success });
            lastBoxSend = now;
         }
      }
      else if (!bothHolding) carryStartMid = null;

      beam.update();
      const choosing = !myRole;
      panel.identity().move(0, 1.53, -.18).scale(choosing ? .74 : 0, choosing ? .42 : 0, 1);
      title.identity().move(0, 1.85, -.16).scale(.40);
      subtitle.identity().move(0, 1.75, -.16).scale(choosing ? .32 : 0);
      hoveredRole = null;
      ROLE.forEach((role, i) => {
         const x = i ? .35 : -.35;
         const available = owners[role] === null;
         buttons[role].identity().move(x, 1.48, -.15)
            .scale(choosing ? .29 : 0, choosing ? .13 : 0, 1)
            .color(available ? COLORS[role] : [.18, .20, .23]);
         if (choosing && available && beam.hitRect(buttons[role].getGlobalMatrix()))
            hoveredRole = role;
      });
      setText(p1Text, 'p1', `PLAYER 1 / ${owners.player1 ? 'TAKEN' : 'LEFT'}`, .055);
      setText(p2Text, 'p2', `PLAYER 2 / ${owners.player2 ? 'TAKEN' : 'RIGHT'}`, .055);
      p1Text.identity().move(-.35, 1.48, -.13).scale(choosing ? .25 : 0);
      p2Text.identity().move(.35, 1.48, -.13).scale(choosing ? .25 : 0);

      const state = success ? 'COOPERATIVE TASK COMPLETE!'
         : !myRole ? 'AIM AND PRESS RIGHT TRIGGER TO SELECT'
         : !owners.player1 || !owners.player2 ? 'WAITING FOR OTHER PLAYER'
         : bothHolding ? 'BOTH HOLDING - MOVE TO TARGET'
         : myHolding ? 'WAITING FOR OTHER PLAYER TO GRAB'
         : 'GRAB YOUR COLORED HANDLE';
      roleButtons.forEach((button, i) => {
         const role = ROLE[i];
         button.disabled = !!myRole || owners[role] !== null || myID() === undefined;
         button.textContent = `${i ? 'Player 2 · Right' : 'Player 1 · Left'}${owners[role] !== null ? ' · Taken' : ''}`;
      });
      grabButton.disabled = !myRole || !owners.player1 || !owners.player2 || success;
      grabButton.textContent = desktopHolding ? 'Release handle' : 'Grab handle';
      desktopSlider.disabled = !desktopHolding || success;
      resetTaskButton.disabled = !myRole;
      desktopStatus.textContent = success ? 'Success on both clients!'
         : !myRole ? 'Choose a role above.'
         : !owners.player1 || !owners.player2 ? 'Waiting for the second player.'
         : bothHolding ? 'Both holding. Move one slider to 1.50 m to finish.'
         : myHolding ? 'Waiting for the other player to grab.'
         : 'Both players: click Grab handle.';
      setText(status, 'status', state, .065);
      status.identity().move(0, 1.69, -.16).scale(.36)
         .color(success ? [.3, 1, .4] : [1, 1, 1]);
      setText(identity, 'identity', myRole ? `YOU ARE ${myRole === 'player1' ? 'PLAYER 1 / LEFT' : 'PLAYER 2 / RIGHT'}` : '', .06);
      identity.identity().move(0, 1.60, -.16).scale(myRole ? .32 : 0)
         .color(myRole ? COLORS[myRole] : [1, 1, 1]);

      resetButton.identity().move(0, 1.42, -.15).scale(myRole ? .22 : 0, myRole ? .065 : 0, 1);
      resetHover = !!myRole && beam.hitRect(resetButton.getGlobalMatrix()) !== null;
      resetButton.color(resetHover ? [.7, .9, 1] : [.24, .35, .42]);
      resetText.identity().move(0, 1.42, -.13).scale(myRole ? .26 : 0);

      box.identity().move(boxXYZ).color(success ? [.35, 1, .45] : [1, 1, 1]);
      handles.player1.color(left?.holding ? [.3, 1, .4] : COLORS.player1);
      handles.player2.color(right?.holding ? [.3, 1, .4] : COLORS.player2);
      target.color(success ? [.3, 1, .4] : [.08, .70, .25]);
      targetText.identity().move(TARGET[0], 1.00, TARGET[2] + .30).scale(.30);
   });
};

export const deinit = () => leaveScene();
