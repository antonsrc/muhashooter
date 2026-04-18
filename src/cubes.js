import * as BABYLON from "@babylonjs/core";

export async function loadCubes(scene, shadowGenerator) {
  try {
    const container = await BABYLON.LoadAssetContainerAsync(
      "./test_cubes.glb",
      scene
    );
    const [rootCubes] = container.meshes;
    rootCubes.scaling.setAll(2);
    rootCubes.position.set(15, 2, 15);
    shadowGenerator.addShadowCaster(rootCubes);
    container.addAllToScene();

    const cubes = [
      // "Cube",
      "Cube.001",
      "Cube.002",
      "Cube.003",
      "Cube.004",
      "Cube.005",
      "Cube.006",
    ];
    cubes.forEach((meshName) => {
      new BABYLON.PhysicsAggregate(
        scene.getMeshByName(meshName),
        BABYLON.PhysicsShapeType.BOX,
        { mass: 100 }
      );
    });

    return container;
  } catch (error) {
    console.error("Error loading model:", error);
  }
}
