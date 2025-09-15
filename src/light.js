import * as BABYLON from "@babylonjs/core";

export function createLight(scene) {
  const light = new BABYLON.DirectionalLight(
    "directLight",
    new BABYLON.Vector3(-1, -2, -1),
    scene
  );
  light.intensity = 2;
  const hemisphericLight = new BABYLON.HemisphericLight(
    "hemisphericLight",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  hemisphericLight.diffuse = new BABYLON.Color3(1, 1, 1);
  hemisphericLight.intensity = 0.5;

  return light;
}
