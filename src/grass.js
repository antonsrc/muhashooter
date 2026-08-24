import { batchModel } from "./utils.js";

export async function loadGrass(scene, radius, ground) {
  const source = "./grass.glb";
  const scaleRange = [2, 4];
  const alphaSet = { useAlphaFromDiffuseTexture: true, alpha: 0.9 };
  const quantity = 8000;
  batchModel(scene, radius, ground, quantity, source, scaleRange, alphaSet);
}
