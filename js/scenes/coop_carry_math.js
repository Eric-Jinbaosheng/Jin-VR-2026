// Shared geometry for the VR scene and its lightweight desktop test.
export const START_BOX = [0, 1.15, -.7];
export const TARGET = [0, 1.15, -1.45];
export const HANDLE_OFFSET = .38;
export const GOAL_RADIUS = .24;

export const distance = (a, b) =>
   Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const midpoint = (a, b) =>
   a.map((value, i) => (value + b[i]) / 2);

export const carriedBoxPosition = (startBox, startMidpoint, leftHand, rightHand) => {
   const currentMidpoint = midpoint(leftHand, rightHand);
   return startBox.map((value, i) => value + currentMidpoint[i] - startMidpoint[i]);
};
