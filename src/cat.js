import * as B from "@babylonjs/core";
import { setAnimation } from "./utils.js";

// ✨
export async function loadCat(scene, shadows, axis) {
  try {
    const container = await B.LoadAssetContainerAsync("./cat.glb", scene);
    const [meshes] = container.meshes;
    const animations = getAnimationGroups(container, ["walk", "idle"]);
    await setAnimation("idle", ["walk"], animations);
    await setAnimationBlending(container);
    await setRoughnessMaterial(meshes);
    await setShadows(meshes, shadows);

    // 🔥 ДОБАВЛЕНО: Создаем камеру внутри loadCat
    const camera = createCatCamera(scene, meshes);

    const currentVelocity = B.Vector3.Zero();

    const state = {
      prevAxisState: {
        w: false,
        a: false,
        s: false,
        d: false,
      },
    };

    const catObservableParams = {
      meshes,
      scene,
      speed: 8,
      axis,
      currentVelocity,
      acceleration: 20,
      animations,
      camera,
      state,
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
// 🔥 ДОБАВЛЕНО: Функция создания камеры внутри модуля кота
function createCatCamera(scene, targetMesh) {
  const headHeightOffset = 4.7;

  // 🔥 ИСПРАВЛЕНО: Начальная позиция с учетом позиции кота
  const initialTarget = new B.Vector3(
    targetMesh.position.x,
    targetMesh.position.y,
    targetMesh.position.z
  );

  const camera = new B.ArcRotateCamera(
    "camera",
    -Math.PI / 2,
    Math.PI / 2 - 0.3,
    15,
    initialTarget,
    scene
  );

  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 500;
  camera.lowerBetaLimit = 0.1;
  camera.upperBetaLimit = Math.PI / 2;
  camera.wheelPrecision = 5;
  camera.angularSensibilityX = 1000;
  camera.angularSensibilityY = 1000;
  camera.inertia = 0.8;

  const canvas = scene.getEngine().getRenderingCanvas();
  camera.attachControl(canvas, true);

  // 🔥 ПЕРЕПИСАНО: Полное обновление позиции камеры вместе с котом
  if (targetMesh) {
    let lastTargetPosition = initialTarget.clone();

    const updateCamera = () => {
      const currentTargetPosition = targetMesh.position.clone();
      currentTargetPosition.y += headHeightOffset;

      // 🔥 ВЫЧИСЛЯЕМ смещение кота от предыдущей позиции
      const positionDelta = currentTargetPosition.subtract(lastTargetPosition);

      // 🔥 ОБНОВЛЯЕМ цель камеры
      camera.setTarget(currentTargetPosition);

      // 🔥 ОБНОВЛЯЕМ позицию камеры (смещаем вместе с котом)
      if (positionDelta.length() > 0.001) {
        camera.position = camera.position.add(positionDelta);
      }

      lastTargetPosition = currentTargetPosition.clone();
    };

    updateCamera();
    scene.onBeforeRenderObservable.add(updateCamera);
  }

  return camera;
}

// ✨🔁
// 🔥 ИСПРАВЛЕНО: Направления движения (были перепутаны A и D)
function catBeforeRenderObservable(params = {}) {
  const {
    meshes,
    scene,
    speed,
    axis,
    currentVelocity,
    acceleration,
    animations,
    camera,
    state,
  } = params;

  if (!meshes || !camera) return;

  const deltaTime = (scene.deltaTime ?? 1) / 1000;
  let isMoving = false;

  // Движение относительно камеры
  if (axis.w || axis.a || axis.s || axis.d) {
    isMoving = true;

    const cameraForward = getCameraForwardDirection(camera);
    const cameraRight = getCameraRightDirection(camera);

    let moveDirection = B.Vector3.Zero();

    if (axis.w) moveDirection.addInPlace(cameraForward); // Вперед
    if (axis.s) moveDirection.addInPlace(cameraForward.scale(-1)); // Назад
    if (axis.a) moveDirection.addInPlace(cameraRight); // Влево 🔥 ИСПРАВЛЕНО
    if (axis.d) moveDirection.addInPlace(cameraRight.scale(-1)); // Вправо 🔥 ИСПРАВЛЕНО

    moveDirection.normalize();
    const targetVelocity = moveDirection.scale(speed);

    B.Vector3.LerpToRef(
      currentVelocity,
      targetVelocity,
      acceleration * deltaTime,
      currentVelocity
    );

    // Автоматический поворот
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

  meshes.position.addInPlace(currentVelocity.scale(deltaTime));
  state.prevAxisState = {
    w: axis.w,
    a: axis.a,
    s: axis.s,
    d: axis.d,
  };

  if (isMoving) {
    setAnimation("walk", ["idle"], animations);
  } else {
    setAnimation("idle", ["walk"], animations);
  }
}

// ✨
// Остальные функции без изменений
function getCameraForwardDirection(camera) {
  const forward = camera.getForwardRay().direction;
  return new B.Vector3(forward.x, 0, forward.z).normalize();
}

// ✨
function getCameraRightDirection(camera) {
  const forward = getCameraForwardDirection(camera);
  const right = B.Vector3.Cross(forward, B.Vector3.Up());
  return right.normalize();
}
