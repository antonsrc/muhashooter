import * as B from "@babylonjs/core";
import { setAnimation } from "./utils.js";

// ✨
export async function loadCat(scene, shadows, pressedKeys) {
  try {
    const container = await B.LoadAssetContainerAsync("./cat.glb", scene);
    const [meshes] = container.meshes;

    const catContainer = new B.TransformNode("catContainer", scene);
    meshes.parent = catContainer;

    const animations = getAnimationGroups(container, ["walk", "idle"]);
    await setAnimation("idle", ["walk"], animations);
    await setAnimationBlending(container);
    await setRoughnessMaterial(meshes);
    await setShadows(meshes, shadows);

    const camera = createCatCamera(scene);
    camera.parent = catContainer;

    const currentVelocity = B.Vector3.Zero();

    const catObservableParams = {
      catContainer, // 🔥 Теперь двигаем контейнер
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

    return container;
  } catch (error) {
    console.error("Error loading model:", error);
  }
}

// ✨
async function setAnimationBlending(container) {
  container.animationGroups.forEach((anim) => {
    anim.enableBlending = true;
    anim.blendingSpeed = 0.4;
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
      mesh.material.specularColor = B.Color3.Black();
      mesh.material.roughness = 1.0;
      mesh.material.metallic = 0.0;
    }
  });
}

// ✨
function getAnimationGroups(container, animations) {
  const groups = {};
  animations.forEach((name) => {
    groups[name] = container.animationGroups.find((g) => g.name === name);
  });
  return groups;
}

// ✨
// 🔥 ПЕРЕРАБОТАННАЯ КАМЕРА: камера как дочерний объект контейнера
function createCatCamera(scene) {
  // 🔥 КАМЕРА СОЗДАЕТСЯ С НУЛЕВОЙ ПОЗИЦИЕЙ

  const camera = new B.ArcRotateCamera(
    "cameraCat",
    -Math.PI / 2, // Альфа (горизонтальный угол)
    Math.PI / 2 - 0.3, // Бета (вертикальный угол)
    15, // Радиус (расстояние от цели)
    B.Vector3.Zero(), // Цель в локальных координатах контейнера
    scene
  );

  // 🔥 НАСТРАИВАЕМ ЛОКАЛЬНУЮ ПОЗИЦИЮ КАМЕРЫ ОТНОСИТЕЛЬНО КОНТЕЙНЕРА
  // Камера сзади и сверху от кота
  camera.position = new B.Vector3(0, 4.7, -15);
  // 🔥 ЦЕЛЬ КАМЕРЫ - В ЛОКАЛЬНЫХ КООРДИНАТАХ (смотрит на центр контейнера)
  camera.setTarget(new B.Vector3(0, 4.7, 0));

  // Настройки камеры
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

  // 🔥 УБИРАЕМ РУЧНОЕ ОБНОВЛЕНИЕ КАМЕРЫ - теперь она автоматически следует за контейнером

  return camera;
}

// ✨🔁
// 🔥 ОБНОВЛЕННАЯ ФУНКЦИЯ ДВИЖЕНИЯ: двигаем контейнер, поворачиваем меш
function catBeforeRenderObservable(params = {}) {
  const {
    catContainer, // 🔥 Двигаем контейнер (а с ним и камеру, и кота)
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

    let moveDirection = B.Vector3.Zero();

    if (pressedKeys.KeyW) moveDirection.addInPlace(cameraForward);
    if (pressedKeys.KeyS) moveDirection.addInPlace(cameraForward.scale(-1));
    if (pressedKeys.KeyA) moveDirection.addInPlace(cameraRight);
    if (pressedKeys.KeyD) moveDirection.addInPlace(cameraRight.scale(-1));

    moveDirection.normalize();
    const targetVelocity = moveDirection.scale(speed);

    B.Vector3.LerpToRef(
      currentVelocity,
      targetVelocity,
      acceleration * deltaTime,
      currentVelocity
    );

    // 🔥 АВТОМАТИЧЕСКИЙ ПОВОРОТ МЕША (не контейнера!)
    if (moveDirection.length() > 0.1) {
      const targetRotation = B.Quaternion.FromLookDirectionLH(
        moveDirection,
        B.Axis.Y
      );

      B.Quaternion.SlerpToRef(
        meshes.rotationQuaternion,
        targetRotation,
        10 * deltaTime,
        meshes.rotationQuaternion
      );
    }
  } else {
    isMoving = false;
    B.Vector3.LerpToRef(
      currentVelocity,
      B.Vector3.Zero(),
      acceleration * deltaTime,
      currentVelocity
    );
  }

  // 🔥 ДВИГАЕМ КОНТЕЙНЕР (а с ним автоматически двигаются камера и кот)
  catContainer.position.addInPlace(currentVelocity.scale(deltaTime));

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
  return new B.Vector3(forward.x, 0, forward.z).normalize();
}

// ✨
function getCameraRightDirection(camera) {
  const forward = getCameraForwardDirection(camera);
  return B.Vector3.Cross(forward, B.Vector3.Up()).normalize();
}
