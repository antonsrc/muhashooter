import * as BABYLON from "@babylonjs/core";

export function initInputDevices(scene, canvas, pressedKeys) {
  scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
      BABYLON.RequestPointerlock(canvas);
    }
  });

  scene.onKeyboardObservable.add((kbInfo) => {
    const code = kbInfo.event.code;
    // console.log(code);
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
        // scene.debugLayer.show({ showInspector: true, showExplorer: true });
      }
    }
  });

  scene.onPointerObservable.add((pointerInfo) => {
    switch (pointerInfo.type) {
      case BABYLON.PointerEventTypes.POINTERDOWN:
        if (pointerInfo.event.button === 0) {
          pressedKeys["leftMouseButton"] = true;
          console.log("leftMouseButton");
        }
        if (pointerInfo.event.button === 1) {
          pressedKeys["middleMouseButton"] = true;
          console.log("middleMouseButton");
        }
        if (pointerInfo.event.button === 2) {
          pressedKeys["rightMouseButton"] = true;
          console.log("rightMouseButton");
        }

        break;
      case BABYLON.PointerEventTypes.POINTERUP:
        if (pointerInfo.event.button === 0) {
          pressedKeys["leftMouseButton"] = false;
        }
        if (pointerInfo.event.button === 1) {
          pressedKeys["middleMouseButton"] = false;
        }
        if (pointerInfo.event.button === 2) {
          pressedKeys["rightMouseButton"] = false;
        }

        // console.log("POINTER UP");
        break;
      case BABYLON.PointerEventTypes.POINTERMOVE:
        // console.log("POINTER MOVE");
        break;
      case BABYLON.PointerEventTypes.POINTERWHEEL:
        console.log("POINTER WHEEL");
        break;
      case BABYLON.PointerEventTypes.POINTERPICK:
        console.log("POINTER PICK");
        break;
      case BABYLON.PointerEventTypes.POINTERTAP:
        console.log("POINTER TAP");
        break;
      case BABYLON.PointerEventTypes.POINTERDOUBLETAP:
        console.log("POINTER DOUBLE-TAP");
        break;
    }
  });
}
