import * as BABYLON from "@babylonjs/core";

import { precomputeGroundHeights, getPos } from "./utils.js";

export async function loadGrass(scene, shadows, groundSize, ground) {
  try {
    const treeContainer = await BABYLON.LoadAssetContainerAsync(
      "./grass.glb",
      scene
    );

    const [treeMeshes] = treeContainer.meshes;
    treeMeshes.scaling.setAll(2);
    treeMeshes.position.x = 0;

    const childMeshes = treeMeshes.getChildMeshes(false);
    const merged = BABYLON.Mesh.MergeMeshes(
      childMeshes,
      true,
      true,
      undefined,
      false,
      false
    );

    const material = new BABYLON.StandardMaterial("materialGrass", scene);
    const originalMat = childMeshes[0]?.material;
    if (originalMat) {
      material.diffuseTexture =
        originalMat.albedoTexture || originalMat.diffuseTexture;

      if (originalMat.opacityTexture) {
        material.opacityTexture = originalMat.opacityTexture;
        material.opacityTexture.hasAlpha = true;
      }
    }

    if (material.diffuseTexture) {
      material.diffuseTexture.hasAlpha = true;
      material.useAlphaFromDiffuseTexture = true;
    }

    material.disableLighting = true;
    material.emissiveColor = new BABYLON.Color3(1, 1, 1);
    material.backFaceCulling = false;
    material.alpha = 0.9;
    material.freeze();

    merged.material = material;
    merged.isPickable = false;
    merged.receiveShadows = false;
    merged.checkCollisions = false;

    const offset = 5;
    const max = groundSize / 2 - 2 - offset;

    const COUNT = 8000;

    let cache = localStorage.getItem("cacheGroundDataGrass");
    let xyz = [];
    if (cache && JSON.parse(cache).length == COUNT) {
      xyz = JSON.parse(cache);
    } else {
      for (let i = 0; i < COUNT; i++) {
        xyz.push(precomputeGroundHeights(ground, scene, offset, max));
      }
      localStorage.setItem("cacheGroundDataGrass", JSON.stringify(xyz));
    }

    const bufferMatrices = new Float32Array(COUNT * 16);
    for (let i = 0; i < COUNT; i++) {
      const [x, y, z] = xyz[i];
      const pos = new BABYLON.Vector3(x, y, z);
      const scale = BABYLON.Vector3.One().setAll(
        BABYLON.Scalar.RandomRange(1, 2)
      );
      const angle = BABYLON.Scalar.RandomRange(0, 2 * Math.PI);
      const rot = BABYLON.Quaternion.FromEulerAngles(0, angle, 0);
      const matrix = BABYLON.Matrix.Compose(scale, rot, pos);
      matrix.copyToArray(bufferMatrices, i * 16);
    }

    merged.thinInstanceSetBuffer("matrix", bufferMatrices, 16, true);
    merged.alwaysSelectAsActiveMesh = false;
    return merged;
  } catch (error) {
    console.error("Error loading model:", error);
  }
}
