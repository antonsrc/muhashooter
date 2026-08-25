import { batchModel } from "./utils.js";

export async function loadTrees(scene, radius, ground) {
  const source = "./tree.glb";
  const scaleRange = [2, 5];
  const alphaSet = { useAlphaFromDiffuseTexture: false, alpha: 1 };
  // const quantity = 1800;
  const quantity = 1000;
  batchModel(scene, radius, ground, quantity, source, scaleRange, alphaSet);
}
