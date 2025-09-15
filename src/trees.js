import * as BABYLON from "@babylonjs/core";

export async function loadTrees(scene, shadows, groundSize) {
  try {
    const treeContainer = await BABYLON.LoadAssetContainerAsync(
      "./tree.glb",
      scene
    );
    const [treeMeshes] = treeContainer.meshes;
    treeMeshes.scaling.setAll(1);
    treeMeshes.position.x = -10;

    const childMeshes = treeMeshes.getChildMeshes(false);
    const merged = BABYLON.Mesh.MergeMeshes(
      childMeshes,
      true,
      true,
      undefined,
      false,
      false
    );

    shadows.addShadowCaster(merged);

    const COUNT = 2_000;
    const offset = 10;
    const max = groundSize / 2 - 2 - offset;

    const getPos = () =>
      (offset + Math.random() * max) * (Math.random() > 0.5 ? 1 : -1);

    for (let i = 0; i < COUNT; i++) {
      const instance = merged.createInstance("treeInstance_" + i);
      const x = getPos();
      const z = getPos();

      instance.position.set(x, 0, z);
      instance.rotate(treeMeshes.up, BABYLON.Scalar.RandomRange(1, 180));
      instance.scaling.setAll(BABYLON.Scalar.RandomRange(0.5, 2));
      instance.freezeWorldMatrix();
      instance.material.freeze();
      instance.alwaysSelectAsActiveMesh = true;
      shadows.addShadowCaster(instance);
    }

    return treeContainer;
  } catch (error) {
    console.error("Error loading model:", error);
  }
}
