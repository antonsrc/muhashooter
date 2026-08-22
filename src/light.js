import * as BABYLON from "@babylonjs/core";

export function createLight(scene) {
  const light = new BABYLON.DirectionalLight(
    "directLight",
    new BABYLON.Vector3(-1, -2, -1),
    scene,
  );
  light.intensity = 2;
  light.autoCalcShadowZBounds = true;

  const hemisphericLight = new BABYLON.HemisphericLight(
    "hemisphericLight",
    new BABYLON.Vector3(0, 1, 0),
    scene,
  );
  hemisphericLight.diffuse = new BABYLON.Color3(1, 1, 1);
  hemisphericLight.intensity = 0.5;

  return light;
}

export function setLightningEnvironment(scene) {
  // scene.clearColor = new BABYLON.Color3(0.5, 0.5, 0.5);
  // scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);
  // scene.fogColor = new BABYLON.Color3(0.9, 0.9, 0.85);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.004;
}
