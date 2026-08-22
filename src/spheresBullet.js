import * as BABYLON from "@babylonjs/core";

export async function createBullets(scene, shadows, pos) {
  const sphere = BABYLON.MeshBuilder.CreateSphere(
    `bullet`,
    { diameter: 0.5, segments: 8 },
    scene,
  );

  const material = new BABYLON.StandardMaterial("material", scene);
  material.diffuseColor = new BABYLON.Color3(
    Math.random(),
    Math.random(),
    Math.random(),
  );
  sphere.material = material;

  shadows.addShadowCaster(sphere);
  sphere.position.set(pos.x, pos.y, pos.z);

  const physicsAggregate = new BABYLON.PhysicsAggregate(
    sphere,
    BABYLON.PhysicsShapeType.SPHERE,
    { mass: 0.01, restitution: 4 },
    scene,
  );

  return { sphere, physicsAggregate };
}
