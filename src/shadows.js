import * as BABYLON from "@babylonjs/core";

export function createShadows(light) {
  const shadowGenerator = new BABYLON.ShadowGenerator(128, light);
  shadowGenerator.filter = BABYLON.ShadowGenerator.FILTER_NONE;
  return shadowGenerator;
}
