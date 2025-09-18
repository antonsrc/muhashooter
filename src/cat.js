import * as BABYLON from "@babylonjs/core";

export async function loadCat(scene, shadows, axis) {
  try {
    const catContainer = await BABYLON.LoadAssetContainerAsync(
      "./cat_anim_speed.glb",
      scene
    );
    let [catMeshes] = catContainer.meshes;
    const catAnimations = {
      walk: catContainer.animationGroups.find((g) => g.name === "walk"),
      idle: catContainer.animationGroups.find((g) => g.name === "idle"),
    };

    console.log(catContainer, catAnimations);

    initCatMeshes(catContainer, catAnimations, shadows);

    const targetRotation = catMeshes.rotationQuaternion.clone();
    const currentVelocity = BABYLON.Vector3.Zero();

    const catObservableParams = {
      catMeshes,
      scene,
      speed: 8,
      targetRotation,
      rotLerpSpeed: 10,
      rotAmount: 4,
      catContainer,
      axis,
      currentVelocity,
      acceleration: 20,
      catAnimations,
    };
    scene.onBeforeRenderObservable.add(() =>
      catBeforeRenderObservable(catObservableParams)
    );
    return catContainer;
  } catch (error) {
    console.error("Error loading model:", error);
  }
}

function catBeforeRenderObservable(params = {}) {
  const {
    catMeshes,
    scene,
    speed,
    targetRotation,
    rotLerpSpeed,
    rotAmount,
    catContainer,
    axis,
    currentVelocity,
    acceleration,
    catAnimations,
  } = params;

  if (!catMeshes) return;

  const deltaTime = (scene.deltaTime ?? 1) / 1000;
  let isMoving = false;

  if (axis.forward) {
    isMoving = true;
    const targetVelocity = catMeshes.forward.scale(axis.forward * speed);

    BABYLON.Vector3.LerpToRef(
      currentVelocity,
      targetVelocity,
      acceleration * deltaTime,
      currentVelocity
    );
  } else {
    isMoving = false;
    BABYLON.Vector3.LerpToRef(
      currentVelocity,
      BABYLON.Vector3.Zero(),
      acceleration * deltaTime,
      currentVelocity
    );
  }

  catMeshes.position.addInPlace(currentVelocity.scale(deltaTime));

  if (axis.right) {
    targetRotation.multiplyInPlace(
      BABYLON.Quaternion.RotationAxis(
        catMeshes.up,
        axis.right * rotAmount * deltaTime
      )
    );
  }

  BABYLON.Quaternion.SlerpToRef(
    catMeshes.rotationQuaternion,
    targetRotation,
    rotLerpSpeed * deltaTime,
    catMeshes.rotationQuaternion
  );

  if (isMoving) {
    setPlayWalk(catAnimations);
  } else {
    setPlayIdle(catAnimations);
  }
}

function initCatMeshes(container, animations, shadows) {
  const [meshes] = container.meshes;

  container.animationGroups.forEach((anim) => {
    anim.enableBlending = true;
    anim.blendingSpeed = 0.1;
  });

  setPlayIdle(animations);
  setRoughnessMaterial(meshes);
  shadows.addShadowCaster(meshes);
}

function setRoughnessMaterial(rootMeshes) {
  rootMeshes.getChildMeshes().forEach((mesh) => {
    mesh.receiveShadows = true;
    if (mesh.material && mesh.material instanceof BABYLON.PBRMaterial) {
      mesh.material.specularColor = BABYLON.Color3.Black();
      mesh.material.roughness = 1.0;
      mesh.material.metallic = 0.0;
    }
  });
}

function setPlayIdle(animations) {
  if (!animations.idle.isPlaying) {
    animations.walk.stop();
    animations.idle.start(true);
  }
}

function setPlayWalk(animations) {
  if (!animations.walk.isPlaying) {
    animations.idle.stop();
    animations.walk.start(true);
  }
}
