import * as BABYLON from "@babylonjs/core";

import { setAnimationBlending, getAnimationGroups } from "./utils.js";

const characterHeight = 6;

export async function loadCat(scene, shadows, pressedKeys, camera) {
  const catGlb = await BABYLON.LoadAssetContainerAsync("./cat.glb", scene);
  const [meshes] = catGlb.meshes;
  const rootContainer = new BABYLON.TransformNode("rootContainer", scene);
  meshes.parent = rootContainer;
  meshes.position.set(0, -characterHeight / 2, 0);

  camera.parent = rootContainer;

  catGlb.meshes.forEach((mesh) => {
    mesh.receiveShadows = true;
  });
  if (shadows) {
    shadows.addShadowCaster(meshes);
  }

  let animations = getAnimationGroups(catGlb, [
    "walk",
    "idle",
    "run",
    "jump",
    "fall",
  ]);
  await setAnimationBlending(catGlb);

  let catController = new BABYLON.PhysicsCharacterController(
    new BABYLON.Vector3(0, characterHeight / 2, 0),
    { capsuleHeight: characterHeight, capsuleRadius: 0.6 },
    scene,
  );
  catController.characterMass = 5;
  catGlb.addAllToScene();

  return { meshes, catController, animations };
}
