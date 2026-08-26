import * as BABYLON from "@babylonjs/core";

export function createBullets(scene, shadows, startPosition, direction) {
  const sphere = BABYLON.MeshBuilder.CreateSphere(
    `bullet`,
    { diameter: 0.3, segments: 4 },
    scene,
  );

  const material = new BABYLON.StandardMaterial("material", scene);
  material.diffuseColor = new BABYLON.Color3(
    Math.random(),
    Math.random(),
    Math.random(),
  );
  sphere.material = material;

  sphere.position.copyFrom(startPosition);

  const bulletSpeed = 150;
  const velocity = direction.normalize().scale(bulletSpeed);

  return {
    mesh: sphere,
    velocity: velocity,
    createdAt: Date.now(),
  };
}
