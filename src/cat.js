import * as BABYLON from "@babylonjs/core";

export async function loadCat(scene, shadows, axis) {
  try {
    const catContainer = await BABYLON.LoadAssetContainerAsync(
      "./cat_to-Y.glb",
      scene
    );
    let [catMeshes] = catContainer.meshes;
    initCatMeshes(catContainer, shadows);

    const targetPoint = catMeshes.position.clone();
    const targetRotation = catMeshes.rotationQuaternion.clone();
    const speed = 10;
    const maxDelta = speed * 0.01;

    const catObservableParams = {
      catMeshes,
      scene,
      speed,
      targetPoint,
      targetRotation,
      rotLerpSpeed: 10,
      rotAmount: 4,
      maxDelta,
      catContainer,
      axis,
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
    targetPoint,
    targetRotation,
    rotLerpSpeed,
    rotAmount,
    maxDelta,
    catContainer,
    axis,
  } = params;

  if (!catMeshes) return;

  const deltaTime = (scene.deltaTime ?? 1) / 1000;

  if (Math.abs(axis.forward) > 0.001) {
    const nextPoint = catMeshes.position.add(
      catMeshes.forward.scale(axis.forward * 0.3)
    );
    targetPoint.copyFrom(nextPoint);
  }

  if (Math.abs(axis.right) > 0.001) {
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

  const diff = targetPoint.subtract(catMeshes.position);

  if (diff.length() < maxDelta) {
    setPlayIdle(catContainer);
    return;
  }

  setPlayWalk(catContainer);

  const dir = diff.normalize();
  const velocity = dir.scaleInPlace(speed * deltaTime);
  catMeshes.position.addInPlace(velocity);
}

function initCatMeshes(container, shadows) {
  const [meshes] = container.meshes;

  setPlayIdle(container);
  setRoughnessMaterial(meshes);
  shadows.addShadowCaster(meshes);
}

function setPlayIdle(container) {
  container.animationGroups.find((group) => group.name === "idle").start(true);
}

function setPlayWalk(container) {
  container.animationGroups.find((group) => group.name === "walk").play();
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
