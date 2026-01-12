import * as BABYLON from "@babylonjs/core";

export function createShadows(light) {
  const shadowGenerator = new BABYLON.CascadedShadowGenerator(1024, light);
  shadowGenerator.cascadeCount = 1;
  shadowGenerator.lambda = 0.5;
  shadowGenerator.quality = BABYLON.ShadowGenerator.QUALITY_LOW;
  shadowGenerator.bias = 0.02;
  shadowGenerator.normalBias = 0.05;
  shadowGenerator.depthScale = 0;

   // Отключаем все фильтры и размытия
  shadowGenerator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_LOW;
  shadowGenerator.usePercentageCloserFiltering = false;
  shadowGenerator.useContactHardeningShadow = false;
  
  // Настройки для резких, пиксельных краев
  shadowGenerator.frustumEdgeFalloff = 0; // Резкие края теней
  shadowGenerator.shadowMaxZ = 100; // Увеличиваем дальность теней
  return shadowGenerator;
}
