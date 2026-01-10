import * as BABYLON from "@babylonjs/core";

export function initInputDevices(scene, canvas, pressedKeys) {
  scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
      BABYLON.RequestPointerlock(canvas);
    }
  });

  scene.onKeyboardObservable.add((kbInfo) => {
    const code = kbInfo.event.code;
    const KEYDOWN = kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN;
    const KEYUP = kbInfo.type === BABYLON.KeyboardEventTypes.KEYUP;
    if (KEYDOWN) {
      pressedKeys[code] = true;
    } else if (KEYUP) {
      pressedKeys[code] = false;
    }

    if (KEYDOWN && code === "Escape") {
      BABYLON.ExitPointerlock();
    }

    if (KEYDOWN && kbInfo.event.ctrlKey && kbInfo.event.altKey) {
      if (scene.debugLayer.isVisible()) {
        scene.debugLayer.hide();
      } else {
        scene.debugLayer.show({ overlay: true });
      }
    }
  });
}
