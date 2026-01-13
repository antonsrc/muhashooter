import * as BABYLON from "@babylonjs/core";
import { setAnimation } from "./utils.js";

export async function loadCat(scene, shadows, pressedKeys) {
  try {
    const catContainer = await BABYLON.LoadAssetContainerAsync(
      "./cat.glb",
      scene
    );
    const [meshes] = catContainer.meshes;

    const rootContainer = new BABYLON.TransformNode("rootContainer", scene);
    meshes.parent = rootContainer;

    const camera = createCatCamera(scene);
    camera.parent = rootContainer;

    const animations = getAnimationGroups(catContainer, ["walk", "idle"]);
    await setAnimationBlending(catContainer);
    await setAnimation("idle", ["walk"], animations);

    await setRoughnessMaterial(meshes);
    await setShadows(meshes, shadows);

    const currentVelocity = BABYLON.Vector3.Zero();

    const catObservableParams = {
      rootContainer, // 🔥 Теперь двигаем контейнер
      meshes, // 🔥 Для поворота меша
      scene,
      speed: 8,
      currentVelocity,
      acceleration: 20,
      animations,
      camera,
      pressedKeys,
    };

    // 🔁
    scene.onBeforeRenderObservable.add(() =>
      catBeforeRenderObservable(catObservableParams)
    );

    return catContainer;
  } catch (error) {
    console.error("Error loading model:", error);
  }
}

function createCatCamera(scene) {
  const camera = new BABYLON.ArcRotateCamera(
    "cameraCat",
    -Math.PI / 2,
    Math.PI / 2 - 0.3,
    15,
    BABYLON.Vector3.Zero(),
    scene
  );

  camera.setPosition(new BABYLON.Vector3(0, 4.7, -15));
  camera.setTarget(new BABYLON.Vector3(0, 4.7, 0));

  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 30;
  camera.lowerBetaLimit = 0.1;
  camera.upperBetaLimit = Math.PI / 2;
  camera.wheelPrecision = 10;
  camera.angularSensibilityX = 1000;
  camera.angularSensibilityY = 1000;
  camera.inertia = 0.8;

  const canvas = scene.getEngine().getRenderingCanvas();
  camera.attachControl(canvas, true);
  return camera;
}

function getAnimationGroups(container, animations) {
  const groups = {};
  animations.forEach((name) => {
    groups[name] = container.animationGroups.find((g) => g.name === name);
  });
  return groups;
}

async function setAnimationBlending(container) {
  container.animationGroups.forEach((anim) => {
    anim.enableBlending = true;
    anim.blendingSpeed = 0.5;
  });
}

// ✨
async function setShadows(meshes, shadows) {
  shadows.addShadowCaster(meshes);
}

// ✨
async function setRoughnessMaterial(meshes) {
  meshes.getChildMeshes().forEach((mesh) => {
    mesh.receiveShadows = true;
    if (mesh.material) {
      mesh.material.specularColor = BABYLON.Color3.Black();
      mesh.material.roughness = 1.0;
      mesh.material.metallic = 0.0;
    }
  });
}

// ✨🔁
// 🔥 ОБНОВЛЕННАЯ ФУНКЦИЯ ДВИЖЕНИЯ: двигаем контейнер, поворачиваем меш
function catBeforeRenderObservable(params = {}) {
  const {
    rootContainer, // 🔥 Двигаем контейнер (а с ним и камеру, и кота)
    meshes, // 🔥 Поворачиваем только меш кота
    scene,
    speed,
    currentVelocity,
    acceleration,
    animations,
    camera,
    pressedKeys,
  } = params;

  const deltaTime = (scene.deltaTime ?? 1) / 1000;
  let isMoving = false;

  // Движение относительно камеры
  if (
    pressedKeys.KeyW ||
    pressedKeys.KeyA ||
    pressedKeys.KeyS ||
    pressedKeys.KeyD
  ) {
    isMoving = true;

    const cameraForward = getCameraForwardDirection(camera);
    const cameraRight = getCameraRightDirection(camera);

    let moveDirection = BABYLON.Vector3.Zero();

    if (pressedKeys.KeyW) moveDirection.addInPlace(cameraForward);
    if (pressedKeys.KeyS) moveDirection.addInPlace(cameraForward.scale(-1));
    if (pressedKeys.KeyA) moveDirection.addInPlace(cameraRight);
    if (pressedKeys.KeyD) moveDirection.addInPlace(cameraRight.scale(-1));

    moveDirection.normalize();
    const targetVelocity = moveDirection.scale(speed);

    BABYLON.Vector3.LerpToRef(
      currentVelocity,
      targetVelocity,
      acceleration * deltaTime,
      currentVelocity
    );

    // 🔥 АВТОМАТИЧЕСКИЙ ПОВОРОТ МЕША (не контейнера!)
    if (moveDirection.length() > 0.1) {
      const targetRotation = BABYLON.Quaternion.FromLookDirectionLH(
        moveDirection,
        BABYLON.Axis.Y
      );

      BABYLON.Quaternion.SlerpToRef(
        meshes.rotationQuaternion,
        targetRotation,
        10 * deltaTime,
        meshes.rotationQuaternion
      );
    }
  } else {
    isMoving = false;
    BABYLON.Vector3.LerpToRef(
      currentVelocity,
      BABYLON.Vector3.Zero(),
      acceleration * deltaTime,
      currentVelocity
    );
  }

  // 🔥 ДВИГАЕМ КОНТЕЙНЕР (а с ним автоматически двигаются камера и кот)
  rootContainer.position.addInPlace(currentVelocity.scale(deltaTime));

  if (isMoving) {
    setAnimation("walk", ["idle"], animations);
  } else {
    setAnimation("idle", ["walk"], animations);
  }
}

// ✨
// Функции направления камеры остаются без изменений
function getCameraForwardDirection(camera) {
  const forward = camera.getForwardRay().direction;
  return new BABYLON.Vector3(forward.x, 0, forward.z).normalize();
}

// ✨
function getCameraRightDirection(camera) {
  const forward = getCameraForwardDirection(camera);
  return BABYLON.Vector3.Cross(forward, BABYLON.Vector3.Up()).normalize();
}
