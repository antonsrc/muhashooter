import * as BABYLON from "@babylonjs/core";

export function createShadows(light) {
  const shadowGenerator = new BABYLON.ShadowGenerator(1024 * 8, light);
  shadowGenerator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_LOW;
  shadowGenerator.bias = 0.004;
  return shadowGenerator;
}
