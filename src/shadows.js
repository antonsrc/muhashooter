import * as BABYLON from "@babylonjs/core";

export function createShadows(light) {
  const shadowGenerator = new BABYLON.ShadowGenerator(2048, light);
  // shadowGenerator.filter = BABYLON.ShadowGenerator.FILTER_NONE;
  shadowGenerator.bias = 0.004;
  return shadowGenerator;
}
