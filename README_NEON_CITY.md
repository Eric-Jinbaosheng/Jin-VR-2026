# NEON CITY 2099 — The Last Light

A single-player, procedural desktop diorama / miniature VR mission for the course Clay/WebXR framework. No AI API or downloaded city models required.

## Start

Run `./run-neon-city.command` from this repository, open http://localhost:2026, and click **neon_city_2099** in the scene selector. The launcher uses the same Node 18 runtime as `run-hw6.command`. The older root `npm start` server is not the recommended course launcher.

For Quest, serve through a trusted HTTPS origin. `./run-neon-city.command https` uses the course server's `key.key` and `cert.cer` files (both ignored by Git). Open the computer's HTTPS hostname on the headset, select the scene, and enter XR using the framework's XR button. A remote plain HTTP LAN URL is not sufficient for WebXR. Headset certificate trust / XR permissions are user setup steps.

## Play

- Normal mode: aim the right controller at the exposed city base and hold trigger to carry the whole city. Release to place it within the tabletop boundary. The tiny head and hands follow physical tracking at 1:12.
- Left X toggles miniature mode; left stick click cycles Plaza → Market → Reactor → Transit → Plaza. These default to button indices 4 and 3, respectively, and **must be verified on the actual controller**. Desktop diagnostics allow changing indices. Aim the right trigger at the floating **ENTER / RETURN** or **NEXT STOP** buttons as a mapping-independent alternative.
- Miniature mode: aim at the nearby red terminal and press right trigger. The controller origin must be within 9.5 cm in city coordinates (1.14 m at rendered street scale). Market lights ads/windows, Reactor starts gold hoops / power paths, Transit starts three hovercars and road lights.
- After 3/3: the Nexus rings and vertical cyan beam activate. Return to normal mode to view the restored city. Power survives switching modes and moving the model.
- Desktop: M = enter/return, N = next stop, E = activate the current nearby terminal. Buttons do the same. Desktop activation is a simulation of reach, not proof of tracked-controller alignment. Restart resets the mission.

## Coordinate model

All city objects, interaction surfaces, and animations live beneath `cityRoot`. Normal mode uses the movable tabletop translation. Miniature mode replaces that display transform with:

`renderPosition = F0 + R_yaw * 12 * (cityPosition - A_floor)`

`F0` is the tracked floor point directly below the viewer when starting or teleporting (Y = 0 in the framework's bounded-floor/local-floor reference space). `A_floor` is the miniature standing point, aligned to the **tabletop height**, including the city-base offset. The actual current eye height is never subtracted away. Thus the avatar eye is the current tracked eye height / 12 above the tabletop; crouching and hand offsets follow the same map. The head mesh extends an estimated 10.5 cm / 12 above the eye, since WebXR supplies eye position rather than the anatomical top of the head. Desktop mode uses the framework's simulated eye height.

The **same frame** maps physical tracking into the avatar in normal mode and maps the city into the physical tracking space in miniature mode. Enter/return only changes the displayed environment: it does not re-anchor position or yaw. Walking, crouching, turning, moving the city, and teleporting therefore preserve the current avatar viewpoint on subsequent mode switches. Only the independent Next Stop action re-anchors horizontal position and heading; it preserves floor-relative eye height. Both XR eyes are averaged for the avatar center. Neither XR view nor projection matrix is modified.

Controller origins and the scene display transform use the same tracking coordinates, independently of the framework's global scene-origin transform. Room/table geometry also receives the inverse city-placement transform in miniature mode, so the tabletop remains visible at the appropriate 12x scale. The avatar is hidden in first person. Transitions fade through a viewer-relative panel.

## Files and validation

- `js/scenes/neon_city_2099.js`: lifecycle, tracking, grab, transition, controls and HUD.
- `js/scenes/neon_city_buildings.js`: 70 × 45 cm base, 10 buildings, signs, roads, terminals, cars and effects.
- `js/scenes/neon_city_math.js`: pure coordinate transforms and mission rules.
- `node tests/neon_city.mjs`: coordinate round trips at multiple headings/waypoints, 1:12 displacement, multiple user heights, crouching, controller separation, eye/heading continuity, teleport height, reach rejection, idempotence, full victory and mode persistence.
- `node tests/neon_city_tracking.mjs`: executes the actual scene against simulated XR poses and a matrix-only renderer; checks height, moved/crouched/turned entry, head/controller alignment, transformed scene origins, tabletop scaling and teleport/return continuity.
- `node tests/hw6_relay.mjs`: previous assignment regression.

Desktop browser validation completed: scene renders; all four waypoints and three terminals work; power reaches CITY ONLINE 3/3. The course's default GLTF environment logs “Empty gltf model” on this local setup; the procedural city renders independently of that asset.

## Quest acceptance checks (pending physical hardware)

1. Confirm X / thumbstick mappings or use the in-world buttons.
2. Verify avatar eye height above tabletop equals tracked eye height / 12. Move head 12 cm and crouch: avatar displacement must be 1 cm. Confirm hands/rays align and both eyes are comfortable.
3. Walk/crouch/turn before entering, then enter and return: the view must come from the visible avatar eye without waypoint/yaw snapping. Repeat after carrying the city and after teleporting.
4. Verify a distant terminal cannot be activated; activate all three from their stops.
5. Return to the full-size view, re-enter, then end/re-enter XR; mission state should persist.
6. Measure headset frame time while all effects run. Geometry uses opaque strips and three cars, without bloom or dynamic lights; no on-device FPS claim has been made.

Branch `neon-city-2099` starts from the user's latest `origin/hw6`, merged with course `upstream/main` at `99dc77c`. Existing customized robot scenes were preserved when resolving the course merge.
