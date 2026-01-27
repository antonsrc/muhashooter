import * as BABYLON from "@babylonjs/core";

/**
 * @param {string} playAnim - "idle"
 * @param {string[]} stopAnims - ["walk", "run"]
 * @param {object} animations - object of AnimationGroup
 */
export async function setAnimation(playAnim, stopAnims, animations, loop = true) {
  if (animations[playAnim].isPlaying) {
    return;
  }
  animations[playAnim].start(loop);
  stopAnims.forEach((a) => animations[a].stop());
}

export async function setAnimationBlending(container) {
  container.animationGroups.forEach((anim) => {
    anim.enableBlending = true;
    anim.blendingSpeed = 0.3;
  });
}

export function getAnimationGroups(container, animations) {
  const groups = {};
  animations.forEach((name) => {
    groups[name] = container.animationGroups.find((g) => g.name === name);
  });
  return groups;
}

export async function setRoughnessMaterial(meshes) {
  meshes.getChildMeshes().forEach((mesh) => {
    mesh.receiveShadows = true;
    if (mesh.material) {
      mesh.material.specularColor = BABYLON.Color3.Black();
      mesh.material.roughness = 1.0;
      mesh.material.metallic = 0.0;
    }
  });
}
