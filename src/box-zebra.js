import * as BABYLON from "@babylonjs/core";

export async function createBoxZebra(scene, shadows) {
  for (let i = 0; i < 15; i++) {
    let baseBoxShape = BABYLON.MeshBuilder.CreateBox(
      "baseBox",
      { width: 10, height: 4, depth: 15 },
      scene
    );
    baseBoxShape.position.set(-10, 2, 14 + i * 15 + i * i * 0.14);
    new BABYLON.PhysicsAggregate(baseBoxShape, BABYLON.PhysicsShapeType.BOX, {
      mass: 0,
    });

    const material = new BABYLON.StandardMaterial("material", scene);
    material.diffuseColor = new BABYLON.Color3(
      0.1 + i * 0.01,
      0,
      0.1 + i * 0.05
    );
    baseBoxShape.material = material;

    if (shadows) {
      shadows.addShadowCaster(baseBoxShape);
    }
  }
}
