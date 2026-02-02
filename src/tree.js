import * as BABYLON from "@babylonjs/core";

export async function loadTree(scene, shadows) {
  try {
    const treeContainer = await BABYLON.LoadAssetContainerAsync(
      "./tree.glb",
      scene
    );
    const [treeMeshes] = treeContainer.meshes;
    treeMeshes.scaling.setAll(1);
    treeMeshes.position.x = 0;
    treeMeshes.position.z = 15;

    treeContainer.meshes.forEach((mesh) => {
      if (mesh.getTotalVertices()) {
        new BABYLON.PhysicsAggregate(
          mesh,
          BABYLON.PhysicsShapeType.MESH,
          { mass: 1 },
          scene
        );
      }
    });

    shadows.addShadowCaster(treeMeshes);
    treeContainer.addAllToScene();
  } catch (error) {
    console.error("Error loading model:", error);
  }
}
