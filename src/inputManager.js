import * as BABYLON from "@babylonjs/core";

export function initKeyboardObservable(scene, canvas, pressedKeys) {
  document.addEventListener("click", async () => {
    console.log("mouse click event");
    BABYLON.RequestPointerlock(canvas);
  });

  // Обработка клавиатуры
  scene.onKeyboardObservable.add((kbInfo) => {
    const code = kbInfo.event.code;
    // console.log(kbInfo.event.code)
    const KEYDOWN = kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN;
    const KEYUP = kbInfo.type === BABYLON.KeyboardEventTypes.KEYUP;

    if (KEYDOWN) {
      pressedKeys[code] = true;

      // Выход из захвата по ESC
      if (code === "Escape") {
        BABYLON.ExitPointerlock();
      }
    } else if (KEYUP) {
      pressedKeys[code] = false;
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
