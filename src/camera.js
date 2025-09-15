import * as BABYLON from "@babylonjs/core";

export function createCamera(scene, canvas) {
  const cameraHeight = 5;
  const cameraRadius = 15;
  const cameraAlpha = -Math.PI / 2;
  const cameraBeta = Math.PI / 2 - 0.3;
  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    cameraAlpha,
    cameraBeta,
    cameraRadius,
    new BABYLON.Vector3(0, cameraHeight, 0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 500;
  camera.lowerBetaLimit = 0;
  camera.upperBetaLimit = Math.PI / 2;
}
