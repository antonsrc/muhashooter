import * as BABYLON from "@babylonjs/core";

export async function loadCubes(scene, shadowGenerator) {
  try {
    const container = await BABYLON.LoadAssetContainerAsync(
      "./cubes.gltf",
      scene
    );
    const [rootCubes] = container.meshes;
    rootCubes.scaling.setAll(3);
    rootCubes.position.x = 10;
    shadowGenerator.addShadowCaster(rootCubes);
    return container;
  } catch (error) {
    console.error("Error loading model:", error);
  }
}
