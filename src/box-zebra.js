import * as BABYLON from "@babylonjs/core";

export async function createBoxZebra(scene, shadows) {
  for (let i = 0; i < 15; i++) {
    let baseBoxShape_0 = BABYLON.MeshBuilder.CreateBox(
      `baseBox_${i}`,
      { width: 10, height: 40, depth: 15 },
      scene,
    );

    baseBoxShape_0.position.set(-10, 2, 14 + i * 15 + i * i * 0.14);
    new BABYLON.PhysicsAggregate(baseBoxShape_0, BABYLON.PhysicsShapeType.BOX, {
      mass: 0,
    });

    const material_0 = new BABYLON.StandardMaterial("material_0", scene);
    material_0.diffuseColor = new BABYLON.Color3(
      0.1 + i * 0.01,
      0,
      0.1 + i * 0.05,
    );
    baseBoxShape_0.material = material_0;

    if (shadows) {
      shadows.addShadowCaster(baseBoxShape_0);
    }
  }
}
