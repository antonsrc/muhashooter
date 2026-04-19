import * as BABYLON from "@babylonjs/core";

export async function loadTrees(scene, shadows, groundSize, ground) {
  try {
    const treeContainer = await BABYLON.LoadAssetContainerAsync(
      "./tree.glb",
      scene
    );
    const treeContainer_1 = await BABYLON.LoadAssetContainerAsync(
      "./tree_1_plane.glb",
      scene
    );

    const [treeMeshes] = treeContainer.meshes;
    treeMeshes.scaling.setAll(1);
    treeMeshes.position.x = 0;
    const [treeMeshes_1] = treeContainer_1.meshes;
    treeMeshes_1.scaling.setAll(1);
    treeMeshes_1.position.x = 0;

    const material = new BABYLON.PBRMaterial("materialTree", scene);

    const childMeshes = treeMeshes.getChildMeshes(false);
    const merged = BABYLON.Mesh.MergeMeshes(
      childMeshes,
      true,
      true,
      undefined,
      false,
      false
    );
    const childMeshes_1 = treeMeshes_1.getChildMeshes(false);
    const merged_1 = BABYLON.Mesh.MergeMeshes(
      childMeshes_1,
      true,
      true,
      undefined,
      false,
      false
    );

    if (childMeshes.length > 0 && childMeshes[0].material) {
      const originalMat = childMeshes[0].material;

      material.albedoTexture =
        originalMat.albedoTexture || originalMat.diffuseTexture;
      material.normalTexture =
        originalMat.bumpTexture || originalMat.normalTexture;
      material.metallicTexture = originalMat.metallicTexture;
      material.roughnessTexture = originalMat.roughnessTexture;
      material.ambientTexture = originalMat.ambientTexture;
      material.emissiveTexture = originalMat.emissiveTexture;

      if (!material.albedoTexture) {
        material.albedoColor =
          originalMat.albedoColor ||
          originalMat.diffuseColor ||
          new BABYLON.Color3(1, 1, 1);
      }
    }

    material.roughness = 1.0; // Максимальная шероховатость
    material.metallic = 0.0; // Отключаем металличность
    material.backFaceCulling = false;

    merged.addLODLevel(150, merged_1);
    merged.addLODLevel(700, null);

    merged.material = material;
    merged.isVisible = false;

    shadows.addShadowCaster(merged);

    // Функция для получения высоты земли в точке
    const getGroundHeight = (x, z) => {
      // Создаем луч сверху вниз
      const ray = new BABYLON.Ray(
        new BABYLON.Vector3(x, 200, z), // Высоко над землей
        new BABYLON.Vector3(0, -1, 0), // Направление вниз
        300 // Длина луча
      );

      // let rayHelper = new BABYLON.RayHelper(ray);
      // rayHelper.show(scene);

      // Проверяем пересечение с землей
      const hit = scene.pickWithRay(
        ray,
        (mesh) => {
          return mesh === ground;
        },
        true
      );

      if (hit.hit) {
        // console.log(hit)
        return hit.pickedPoint.y;
      }

      // Если луч не попал в землю, возвращаем 0 (или другую высоту по умолчанию)
      console.warn(`Could not find ground at (${x}, ${z}), using y=0`);
      return 0;
    };

    const COUNT = 1000;

    const offset = 10;
    const max = groundSize / 2 - 2 - offset;

    const getPos = () =>
      (offset + Math.random() * max) * (Math.random() > 0.5 ? 1 : -1);

    for (let i = 0; i < COUNT; i++) {
      const instance = merged.createInstance("treeInstance_" + i);
      const x = getPos();
      const z = getPos();

      const groundY = getGroundHeight(x, z);

      instance.position.set(x, groundY, z);
      instance.rotate(treeMeshes.up, BABYLON.Scalar.RandomRange(1, 180));

      const scale = BABYLON.Scalar.RandomRange(1, 3);
      instance.scaling.setAll(scale);
      instance.freezeWorldMatrix();
      instance.material.freeze();
      instance.alwaysSelectAsActiveMesh = true;

      if (instance.getTotalVertices()) {
        new BABYLON.PhysicsAggregate(instance, BABYLON.PhysicsShapeType.BOX, {
          mass: 0,
          extents: new BABYLON.Vector3(1 * scale, 20 * scale, 1 * scale),
        });
      }

      shadows.addShadowCaster(instance);
    }

    treeContainer.addAllToScene();
    return treeContainer;
  } catch (error) {
    console.error("Error loading model:", error);
  }
}
