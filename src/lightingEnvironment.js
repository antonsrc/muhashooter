import * as BABYLON from "@babylonjs/core";

export function setLightningEnvironment(scene) {
  // scene.clearColor = new BABYLON.Color3(0.5, 0.5, 0.5);
  // scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);
  // scene.fogColor = new BABYLON.Color3(0.9, 0.9, 0.85);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.004;


}
