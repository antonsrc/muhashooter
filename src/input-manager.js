import * as BABYLON from "@babylonjs/core";

export function initInputDevices(scene, canvas, keys) {
  scene.onKeyboardObservable.add((kbInfo) => {
    const code = kbInfo.event.code;
    const KEYDOWN = kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN;
    const KEYUP = kbInfo.type === BABYLON.KeyboardEventTypes.KEYUP;

    if (KEYDOWN) keys[code] = true;
    else if (KEYUP) keys[code] = false;

    if (KEYDOWN && code === "Escape") BABYLON.ExitPointerlock();

    if (KEYDOWN && kbInfo.event.ctrlKey && kbInfo.event.altKey) {
      if (scene.debugLayer.isVisible()) {
        scene.debugLayer.hide();
      } else {
        scene.debugLayer.show({ overlay: true });
        // scene.debugLayer.show({ showInspector: true, showExplorer: true });
      }
    }
  });

  scene.onPointerObservable.add((pointerInfo) => {
    switch (pointerInfo.type) {
      case BABYLON.PointerEventTypes.POINTERDOWN:
        BABYLON.RequestPointerlock(canvas);
        if (pointerInfo.event.button === 0) keys.leftMouseButton = true;
        else if (pointerInfo.event.button === 1) keys.middleMouseButton = true;
        else keys.rightMouseButton = true;
        break;
      case BABYLON.PointerEventTypes.POINTERUP:
        if (pointerInfo.event.button === 0) keys.leftMouseButton = false;
        else if (pointerInfo.event.button === 1) keys.middleMouseButton = false;
        else keys.rightMouseButton = false;
        break;
    }
  });
}
