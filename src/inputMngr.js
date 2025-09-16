import * as BABYLON from "@babylonjs/core";

const pressedKeys = {};

export function initKeyboardObservable(scene, axis) {
  scene.onKeyboardObservable.add((ev) => {
    const code = ev.event.code;
    const KEYDOWN = ev.type === BABYLON.KeyboardEventTypes.KEYDOWN;
    const KEYUP = ev.type === BABYLON.KeyboardEventTypes.KEYUP;

    if (KEYDOWN) {
      pressedKeys[code] = true;
    } else if (KEYUP) {
      pressedKeys[code] = false;
    }

    updateAxis(axis);

    if (KEYDOWN && ev.event.ctrlKey && ev.event.altKey) {
      if (scene.debugLayer.isVisible()) {
        scene.debugLayer.hide();
      } else {
        scene.debugLayer.show({ overlay: true });
      }
    }

    ev.event.preventDefault();
  });
}

function updateAxis(axis) {
  axis.forward = (pressedKeys.KeyW ? 1 : 0) + (pressedKeys.KeyS ? -1 : 0);
  axis.right = (pressedKeys.KeyA ? -1 : 0) + (pressedKeys.KeyD ? 1 : 0);
  axis.up = (pressedKeys.Space ? 1 : 0) + (pressedKeys.ShiftLeft ? -1 : 0);
}
