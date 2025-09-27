import * as BABYLON from "@babylonjs/core";

const headHeightOffset = 3; // 🔥 Увеличил смещение

export function createCamera(scene, canvas, targetMesh = null) {
  const cameraHeight = 5;
  const cameraRadius = 15;
  const cameraAlpha = -Math.PI / 2;
  const cameraBeta = Math.PI / 2 - 0.3;

  // 🔥 ИСПРАВЛЕНО: Временно используем нулевую позицию
  const initialTarget = new BABYLON.Vector3(0, cameraHeight, 0);

  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    cameraAlpha,
    cameraBeta,
    cameraRadius,
    initialTarget,
    scene
  );

  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 500;
  camera.lowerBetaLimit = 0.1;
  camera.upperBetaLimit = Math.PI / 2;
  camera.panningSensibility = 0;
  camera.wheelPrecision = 50;
  camera.angularSensibilityX = 1000;
  camera.angularSensibilityY = 1000;
  camera.inertia = 0.8;

  camera.attachControl(canvas, true);

  // 🔥 ПЕРЕПИСАНО: Правильное обновление цели с смещением
  if (targetMesh) {
    // 🔥 Сразу устанавливаем правильную цель
    const targetPosition = targetMesh.position.clone();
    targetPosition.y += headHeightOffset;
    camera.setTarget(targetPosition);

    // 🔥 Динамическое обновление
    scene.onBeforeRenderObservable.add(() => {
      const newTargetPosition = targetMesh.position.clone();
      newTargetPosition.y += headHeightOffset;
      camera.setTarget(newTargetPosition);
    });
  }

  return camera;
}
