import * as BABYLON from "@babylonjs/core";

export async function createEnemy(scene, shadows) {
  let enemyMesh = BABYLON.MeshBuilder.CreateCapsule(
    "enemy",
    { radius: 2, height: 10, subdivisions: 2 },
    scene,
  );

  enemyMesh.position.set(10, 5, 40);
  new BABYLON.PhysicsAggregate(enemyMesh, BABYLON.PhysicsShapeType.BOX, {
    mass: 0,
  });

  const enemyMaterial = new BABYLON.StandardMaterial("enemyMaterial", scene);
  enemyMaterial.diffuseColor = new BABYLON.Color3(1, 0.1, 0.1);
  enemyMesh.material = enemyMaterial;

  if (shadows) {
    shadows.addShadowCaster(enemyMesh);
  }

  return {
    mesh: enemyMesh,
    hp: 3,
    speed: 7,
    targetPosition: new BABYLON.Vector3(0, 5, 0),
    isMoving: true,
  };
}
