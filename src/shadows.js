import * as BABYLON from "@babylonjs/core";

export function createShadows(light) {
  const shadowGenerator = new BABYLON.CascadedShadowGenerator(2048, light);
  shadowGenerator.cascadeCount = 3;
  shadowGenerator.lambda = 0.95;
  shadowGenerator.quality = BABYLON.ShadowGenerator.QUALITY_LOW;
  shadowGenerator.bias = 0.001;
  shadowGenerator.normalBias = 0.01;
  return shadowGenerator;
}
