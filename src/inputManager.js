import * as BABYLON from "@babylonjs/core";

const pressedKeys = {};
let isPointerLock = false;
let mouseDeltaX = 0;
let mouseDeltaY = 0;

export function initKeyboardObservable(scene, axis, canvas) {
  // 🔥 Захват указателя при клике
  canvas.addEventListener("click", () => {
    if (!isPointerLock) {
      requestPointerLock(canvas);
    }
  });

  // 🔥 Обработка изменения состояния захвата
  document.addEventListener("pointerlockchange", (event) =>
    pointerLockChange(event, scene, canvas)
  );

  // 🔥 Обработка движения мыши в режиме захвата
  document.addEventListener("mousemove", (event) =>
    handleMouseMove(event, scene)
  );

  // Обработка клавиатуры
  scene.onKeyboardObservable.add((ev) => {
    const code = ev.event.code;
    const KEYDOWN = ev.type === BABYLON.KeyboardEventTypes.KEYDOWN;
    const KEYUP = ev.type === BABYLON.KeyboardEventTypes.KEYUP;

    if (KEYDOWN) {
      pressedKeys[code] = true;

      // 🔥 Выход из захвата по ESC
      if (code === "Escape" && isPointerLock) {
        document.exitPointerLock();
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

function pointerLockChange(event, scene, canvas) {
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

function handleMouseMove(event, scene) {
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

function requestPointerLock(canvas) {
  canvas.requestPointerLock =
    canvas.requestPointerLock ||
    canvas.mozRequestPointerLock ||
    canvas.webkitRequestPointerLock;
  if (canvas.requestPointerLock) {
    canvas.requestPointerLock();
  }
}

function updateAxis(axis) {
  axis.w = !!pressedKeys.KeyW;
  axis.a = !!pressedKeys.KeyA;
  axis.s = !!pressedKeys.KeyS;
  axis.d = !!pressedKeys.KeyD;
}
