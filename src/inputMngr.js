import * as BABYLON from "@babylonjs/core";

const pressedKeys = {};
let isPointerLock = false;
let mouseDeltaX = 0;
let mouseDeltaY = 0;

export function initKeyboardObservable(scene, axis) {
  const canvas = scene.getEngine().getRenderingCanvas();

  // 🔥 Захват указателя при клике
  canvas.addEventListener("click", () => {
    if (!isPointerLock) {
      requestPointerLock(canvas);
    }
  });

  // 🔥 Обработка изменения состояния захвата
  document.addEventListener("pointerlockchange", pointerLockChange);
  document.addEventListener("mozpointerlockchange", pointerLockChange);
  document.addEventListener("webkitpointerlockchange", pointerLockChange);

  // 🔥 Обработка движения мыши в режиме захвата
  document.addEventListener("mousemove", handleMouseMove);

  function pointerLockChange() {
    const wasLocked = isPointerLock;
    isPointerLock =
      document.pointerLockElement === canvas ||
      document.mozPointerLockElement === canvas ||
      document.webkitPointerLockElement === canvas;

    if (scene.activeCamera) {
      if (isPointerLock && !wasLocked) {
        // Вход в захват - включаем управление камерой
        scene.activeCamera.detachControl();
        scene.activeCamera.attachControl(canvas, false); // 🔥 false - используем свою обработку мыши
      } else if (!isPointerLock && wasLocked) {
        // Выход из захвата - отключаем управление
        scene.activeCamera.detachControl();
      }
    }
  }

  function handleMouseMove(event) {
    if (!isPointerLock) return;

    mouseDeltaX =
      event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    mouseDeltaY =
      event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    // 🔥 Применяем движение к камере
    if (
      scene.activeCamera &&
      scene.activeCamera instanceof BABYLON.ArcRotateCamera
    ) {
      scene.activeCamera.alpha -= mouseDeltaX * 0.001;
      scene.activeCamera.beta -= mouseDeltaY * 0.001;

      // 🔥 Ограничиваем угол наклона камеры
      scene.activeCamera.beta = Math.max(
        0.1,
        Math.min(Math.PI / 2, scene.activeCamera.beta)
      );
    }
  }

  // Обработка клавиатуры
  scene.onKeyboardObservable.add((ev) => {
    const code = ev.event.code;
    const KEYDOWN = ev.type === BABYLON.KeyboardEventTypes.KEYDOWN;
    const KEYUP = ev.type === BABYLON.KeyboardEventTypes.KEYUP;

    if (KEYDOWN) {
      pressedKeys[code] = true;

      // 🔥 Выход из захвата по ESC
      if (code === "Escape" && isPointerLock) {
        exitPointerLock();
      }
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
  });
}

function requestPointerLock(canvas) {
  canvas.requestPointerLock =
    canvas.requestPointerLock ||
    canvas.mozRequestPointerLock ||
    canvas.webkitRequestPointerLock;
  if (canvas.requestPointerLock) {
    canvas.requestPointerLock();
  }
}

export function exitPointerLock() {
  document.exitPointerLock =
    document.exitPointerLock ||
    document.mozExitPointerLock ||
    document.webkitExitPointerLock;
  if (document.exitPointerLock) {
    document.exitPointerLock();
  }
}

function updateAxis(axis) {
  axis.w = !!pressedKeys.KeyW;
  axis.a = !!pressedKeys.KeyA;
  axis.s = !!pressedKeys.KeyS;
  axis.d = !!pressedKeys.KeyD;
}

export function isPointerLocked() {
  return isPointerLock;
}

// 🔥 ДОБАВЛЕНО: Получение дельты мыши для кастомного управления
export function getMouseDelta() {
  return { x: mouseDeltaX, y: mouseDeltaY };
}
