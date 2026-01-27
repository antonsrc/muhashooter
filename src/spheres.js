import * as BABYLON from "@babylonjs/core";

export async function createSpheres(scene, shadows) {
  for (let i = 0; i < 10; i++) {
    const sphere = BABYLON.MeshBuilder.CreateSphere(
      `sphere.${i}`,
      { diameter: 0.5 + Math.random(), segments: 8 },
      scene
    );

    const material = new BABYLON.StandardMaterial("material", scene);
    material.diffuseColor = new BABYLON.Color3(
      Math.random(),
      Math.random(),
      Math.random()
    );
    sphere.material = material;

    shadows.addShadowCaster(sphere);
    sphere.position.set(
      -10 + Math.random() * 10,
      2 + Math.random() * 10,
      15 + Math.random() * 10
    );

    new BABYLON.PhysicsAggregate(
      sphere,
      BABYLON.PhysicsShapeType.SPHERE,
      { mass: 1, restitution: 0.9 },
      scene
    );
  }
}
