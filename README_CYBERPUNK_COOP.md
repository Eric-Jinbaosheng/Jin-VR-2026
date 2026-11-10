# Cyberpunk City: Giant & Runner (HW7)

Start with `./run-neon-city.command` (Node 18 course server), open http://localhost:2026, and select **cyberpunk_coop** in two separate browser windows. Both must connect to the same server. The previous neon_city_2099 scene remains available. For Quest use `./run-neon-city.command https` with a headset-trusted certificate.

## Play

Choose different roles using desktop buttons or the right controller ray on the floating HUD. Any actual client ID can own either role; additional clients spectate. The mission waits for both roles.

- Giant: move the pink bridge from the back-left storage area to the red gap between roads. Hold right trigger with the controller within 15 cm of the bridge, drag, and release within 6.5 cm of the target to snap. The first two buildings can also be grabbed near their centers and moved in the rear district.
- Runner: use NEXT twice after the bridge is placed to reach the energy station, then bring the right controller near the cyan core and press trigger. NEXT once more reaches the tower; touch its orange panel with the trigger to activate it. BACK retraces adjacent nodes. Mission progress requires these nodes; room-scale walking cannot bypass the task gates.
- Both see MISSION COMPLETE and a green tower beam. RESET is available to either role and preserves role ownership.

Desktop is a playable second client: Giant clicks Grab, adjusts Bridge X to **0**, Bridge Z to **-0.48**, then clicks Release. Runner clicks Next twice, Touch, Next, Touch. Its camera is the actual miniature view, with the framework's desktop looking controls; the Touch button supplies reach at the current mission node. Physical reach remains required in VR. Movable buildings currently use VR controls only.

## Coordinates and synchronization

World units are tabletop metres; the tabletop is at Y=0.78. Giant tracking maps directly to shared world. Runner display is `T(tracked floor) * R(initial yaw) * S(12) * T(-waypoint)`. Its inverse maps the tracked head and both controllers into shared world. Thus 12 cm of motion becomes 1 cm and eye height is tabletop + tracked height / 12. The model origin is cancelled before displaying this transform. Teleports re-anchor floor position and heading, preserving tracked height. No XR projection matrices are modified.

The scene uses the existing course `server.init/send/sync` transport. Poses are published in shared coordinates at 20 Hz, using raw tracking matrices to avoid applying the framework scene origin twice. It does not assume `clientState.head(0)` is a player. The smallest active scene participant ID coordinates role requests and gameplay; snapshots at 10 Hz repair late join state. Heartbeats release disconnected or departed role owners after at most four seconds. A remaining participant takes over coordination using its latest snapshot. Reset epochs reject queued actions from an older mission. This is a trusted classroom-client protocol, not a security boundary against modified clients. A full server/all-client restart starts a fresh mission; snapshots are session state, not a durable save.

## Validation

Passed:

- `node tests/cyberpunk_coop.mjs`: roles, permissions, client 0, bridge gating, reach, full mission, snapshot serialization, reset epochs and role reclaim.
- `node tests/cyberpunk_coop_tracking.mjs`: actual scene executed with simulated renderer/tracking/transport; elected authority, head/hand round trips, nonidentity scene origin, 1:12 displacement and teleport.
- `node tests/neon_city.mjs`, `node tests/neon_city_tracking.mjs`, `node tests/hw6_relay.mjs`: prior assignment regressions.

Pending manual acceptance (browser automation host unavailable during implementation):

1. Two real windows: simultaneous role selection, one Giant/one Runner, full mission and identical victory state.
2. Reload one client mid-mission, reclaim freed role, verify state and bridge match; close coordinator, verify surviving player's takeover.
3. Two headsets (or headset + desktop): Giant moves left/right around table; Runner sees matching direction. Check head size, crouch height, hands, ray targets and stereo comfort.
4. Verify trigger drag/release, both building grabs, core/tower reach, reset on both clients, and on-device frame rate.

Professor upstream merged at `4f2ab79`; menu includes both the previous homework scenes and the new minime example.
