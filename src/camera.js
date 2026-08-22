import * as BABYLON from "@babylonjs/core";

export function createCamera(scene) {
  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    -Math.PI / 2,
    Math.PI / 2 - 0.3,
    15,
    BABYLON.Vector3.Zero(),
    scene,
  );

  camera.setPosition(new BABYLON.Vector3(0, 4.7, -15));
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 30;
  camera.lowerBetaLimit = 0.1;
  camera.upperBetaLimit = Math.PI / 2;
  camera.wheelPrecision = 10;
  camera.angularSensibilityX = 1000;
  camera.angularSensibilityY = 1000;
  camera.inertia = 0.8;
  camera.setTarget(BABYLON.Vector3.Zero());

  const canvas = scene.getEngine().getRenderingCanvas();
  camera.attachControl(canvas, true);
  return camera;
}
