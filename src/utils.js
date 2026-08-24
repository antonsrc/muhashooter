import * as BABYLON from "@babylonjs/core";

/**
 * @param {string} playAnim - "idle"
 * @param {string[]} stopAnims - ["walk", "run"]
 * @param {object} animations - object of AnimationGroup
 */
export async function setAnimation(
  playAnim,
  stopAnims,
  animations,
  loop = true,
) {
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

export function precomputeGroundHeights(
  ground,
  scene,
  radius,
  offsetX,
  offsetZ,
) {
  const x = getPos(radius, offsetX);
  const z = getPos(radius, offsetZ);
  const ray = new BABYLON.Ray(
    new BABYLON.Vector3(x, 200, z),
    BABYLON.Vector3.Down(),
    300,
  );

  const hit = scene.pickWithRay(
    ray,
    (mesh) => {
      return mesh === ground;
    },
    true,
  );
  const y = hit.hit ? hit.pickedPoint.y : 0;
  return [x, y, z];
}

export function getPos(radius, offset = 0) {
  return (offset + Math.random() * radius) * (Math.random() > 0.5 ? 1 : -1);
}

export async function batchModel(
  scene,
  radius,
  ground,
  quantity,
  source,
  scaleRange,
  alphaSet,
) {
  const fileName = source.split("/").at(-1);

  try {
    const container = await BABYLON.LoadAssetContainerAsync(source, scene);
    const [meshes] = container.meshes;
    meshes.scaling.setAll(1);
    meshes.position.x = 0;

    const childMeshes = meshes.getChildMeshes(false);
    const merged = BABYLON.Mesh.MergeMeshes(childMeshes, true, true);

    const material = new BABYLON.StandardMaterial(`material${fileName}`, scene);
    const originalMat = childMeshes[0]?.material;
    if (originalMat) {
      material.diffuseTexture =
        originalMat.albedoTexture || originalMat.diffuseTexture;

      if (originalMat.opacityTexture) {
        material.opacityTexture = originalMat.opacityTexture;
        material.opacityTexture.hasAlpha = true;
      }
    }

    if (material.diffuseTexture) {
      material.diffuseTexture.hasAlpha = true;
      material.useAlphaFromDiffuseTexture = alphaSet.useAlphaFromDiffuseTexture;
    }

    material.disableLighting = true;
    material.emissiveColor = new BABYLON.Color3(1, 1, 1);
    material.backFaceCulling = false;
    material.alpha = alphaSet.alpha;
    material.freeze();

    merged.material = material;
    merged.isPickable = false;
    merged.receiveShadows = false;
    merged.checkCollisions = false;

    const cache = localStorage.getItem(`cacheGround${fileName}`);
    let xyz = [];
    if (cache && JSON.parse(cache).length == quantity) {
      xyz = JSON.parse(cache);
    } else {
      for (let i = 0; i < quantity; i++) {
        xyz.push(precomputeGroundHeights(ground, scene, radius));
      }
      localStorage.setItem(`cacheGround${fileName}`, JSON.stringify(xyz));
    }

    const bufferMatrices = new Float32Array(quantity * 16);
    for (let i = 0; i < quantity; i++) {
      const [x, y, z] = xyz[i];
      const pos = new BABYLON.Vector3(x, y, z);
      const scale = BABYLON.Vector3.One().setAll(
        BABYLON.Scalar.RandomRange(...scaleRange),
      );
      const angle = BABYLON.Scalar.RandomRange(0, 2 * Math.PI);
      const rot = BABYLON.Quaternion.FromEulerAngles(0, angle, 0);
      const matrix = BABYLON.Matrix.Compose(scale, rot, pos);
      matrix.copyToArray(bufferMatrices, i * 16);
    }

    merged.thinInstanceSetBuffer("matrix", bufferMatrices, 16, true);
    merged.alwaysSelectAsActiveMesh = false;
    return merged;
  } catch (error) {
    console.error("Error loading model:", error);
  }
}
