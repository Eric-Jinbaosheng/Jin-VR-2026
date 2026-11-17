# Neon City Spatial Design Studio

November 17 VR assignment. Use the laptop's physical keyboard and trackpad to revise a miniature city while viewing it on a Quest in mixed reality. The ten editable buildings reuse the geometry from Neon City 2099.

## Start

From this repository, run `./run-neon-city.command` and open [Desktop editor](http://localhost:2026/?studio=editor). To check synchronization from a second desktop window, open [Headset view](http://localhost:2026/?studio=viewer). Run one editor per server. The viewer updates live and can join after editing has started.

For a wireless Quest demo, run `./run-neon-city.command https` with a trusted `key.key` and `cert.cer` for the server hostname. Open `https://<server-hostname>:2026/?studio=editor` on the Mac and `https://<server-hostname>:2026/?studio=viewer` in Quest Browser. Both must reach the same server. Select **Enter AR** on Quest.

For a wired development setup, connect the authorized Quest to the Mac over USB and check `adb devices`. Run `adb reverse tcp:2026 tcp:2026` with the HTTP server running, then open `http://localhost:2026/?studio=viewer` in Quest Browser. This uses Android's [reverse port forwarding](https://developer.android.com/develop/ui/views/layout/webapps/access-local-server).

## Demo

[Watch the Quest 3S recording (MP4)](media/hw9/quest-demo.mp4?raw=true). The Mac editor and the actual headset view are shown side by side.

1. In Quest, face the real desk. On the Mac, open **Headset placement**, enter the physical desk height in centimetres (default 78), and press **P** with focus outside a text field while looking toward the middle of the desk. The 70 × 45 cm city board sits at that height, in the direction the wearer faced at placement. It stays in place as the wearer moves.
2. Press **2** to select Night Tower. Use the **arrow keys** to move it in 5 mm steps or drag footprint **2** on the trackpad. Hold **Shift** for 25 mm steps. Press **+ / −** to resize and **C** to cycle accent colors. **Move left**, **Move right**, **Lower**, and **Raise** below the plan use the same steps and also support Shift. The inspector accepts exact X, Z, and height values in millimetres.
3. Type a new name and note, such as **Transit Canopy** and **Raise the roof for a clear sightline.** The spatial placard follows the selected building and displays its name, measurements, and note.
4. Line up the centre dot in the headset with another building until its number appears in amber above its roof. Press **G** on the Mac or click **Pick gaze** to confirm. The target stays active for three seconds after looking away, so there is time to glance at the keyboard. The white footprint marks the current edit target. This uses head direction.
5. Press **S** or click **Save**, make another edit, then click **Restore**. One saved snapshot is stored in that browser and origin. Restore sends it to the viewer.

## Future workflow

A designer can walk around a 3D massing model to judge spacing and sightlines, look at the next building to edit, then use the physical keyboard to enter exact dimensions and write a review note. The trackpad makes rough layout changes on a familiar 2D plan, and the headset shows the consequences from the designer's current viewpoint.

## Verification

- Tested with two Chrome browser contexts against the course WebSocket server. Verified selection, trackpad drag, resize, color, names, notes, save and restore, synchronization, and viewer reload.
- Tested on a Quest 3S over USB port forwarding. Verified passthrough, gaze selection with **G**, live height changes, and building movement. Also tested remote re-placement with a simulated head pose.
- Run `node tests/spatial_studio.mjs` for design snapshot, board bounds, and gaze intersection checks. The previous Neon City, co-op, and relay tests also pass.

The course examples `kbdEvents.js`, `kbdEvents2.js`, and `textEdit.js` are available from the scene menu. The studio uses the same global broadcast transport for live snapshots and a dedicated browser inspector for text entry.
