import * as BABYLON from "@babylonjs/core";

// 🔥 ДОБАВЛЕНО: Функция создания камеры внутри модуля кота
function createCatCamera(scene, canvas, targetMesh) {
  const headHeightOffset = 3;
  const cameraRadius = 15;

  // 🔥 ИСПРАВЛЕНО: Начальная позиция с учетом позиции кота
  const initialTarget = targetMesh
    ? new BABYLON.Vector3(
        targetMesh.position.x,
        targetMesh.position.y + headHeightOffset,
        targetMesh.position.z
      )
    : new BABYLON.Vector3(0, headHeightOffset, 0);

  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    -Math.PI / 2,
    Math.PI / 2 - 0.3,
    cameraRadius,
    initialTarget,
    scene
  );

  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 500;
  camera.lowerBetaLimit = 0.1;
  camera.upperBetaLimit = Math.PI / 2;
  camera.wheelPrecision = 50;
  camera.angularSensibilityX = 1000;
  camera.angularSensibilityY = 1000;
  camera.inertia = 0.8;

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

export async function loadCat(scene, shadows, axis) {
  // 🔥 УБРАЛ camera параметр
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

    initCatMeshes(catContainer, catAnimations, shadows);

    // 🔥 ДОБАВЛЕНО: Создаем камеру внутри loadCat
    const canvas = scene.getEngine().getRenderingCanvas();
    const camera = createCatCamera(scene, canvas, catMeshes);

    const currentVelocity = BABYLON.Vector3.Zero();

    const state = {
      prevAxisState: { w: false, a: false, s: false, d: false },
    };

    const catObservableParams = {
      catMeshes,
      scene,
      speed: 8,
      catContainer,
      axis,
      currentVelocity,
      acceleration: 20,
      catAnimations,
      camera,
      state,
    };

    scene.onBeforeRenderObservable.add(() =>
      catBeforeRenderObservable(catObservableParams)
    );

    return catContainer;
  } catch (error) {
    console.error("Error loading model:", error);
  }
}

// 🔥 ИСПРАВЛЕНО: Направления движения (были перепутаны A и D)
function catBeforeRenderObservable(params = {}) {
  const {
    catMeshes,
    scene,
    speed,
    catContainer,
    axis,
    currentVelocity,
    acceleration,
    catAnimations,
    camera,
    state,
  } = params;

  if (!catMeshes || !camera) return;

  const deltaTime = (scene.deltaTime ?? 1) / 1000;
  let isMoving = false;

  // Движение относительно камеры
  if (axis.w || axis.a || axis.s || axis.d) {
    isMoving = true;

    const cameraForward = getCameraForwardDirection(camera);
    const cameraRight = getCameraRightDirection(camera);

    let moveDirection = BABYLON.Vector3.Zero();

    if (axis.w) moveDirection.addInPlace(cameraForward); // Вперед
    if (axis.s) moveDirection.addInPlace(cameraForward.scale(-1)); // Назад
    if (axis.a) moveDirection.addInPlace(cameraRight); // Влево 🔥 ИСПРАВЛЕНО
    if (axis.d) moveDirection.addInPlace(cameraRight.scale(-1)); // Вправо 🔥 ИСПРАВЛЕНО

    moveDirection.normalize();
    const targetVelocity = moveDirection.scale(speed);

    BABYLON.Vector3.LerpToRef(
      currentVelocity,
      targetVelocity,
      acceleration * deltaTime,
      currentVelocity
    );

    // Автоматический поворот
    if (moveDirection.length() > 0.1) {
      const targetRotation = BABYLON.Quaternion.FromLookDirectionLH(
        moveDirection,
        BABYLON.Axis.Y
      );

      BABYLON.Quaternion.SlerpToRef(
        catMeshes.rotationQuaternion,
        targetRotation,
        10 * deltaTime,
        catMeshes.rotationQuaternion
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

  catMeshes.position.addInPlace(currentVelocity.scale(deltaTime));
  state.prevAxisState = { w: axis.w, a: axis.a, s: axis.s, d: axis.d };

  if (isMoving) {
    setPlayWalk(catAnimations);
  } else {
    setPlayIdle(catAnimations);
  }
}

// Остальные функции без изменений
function getCameraForwardDirection(camera) {
  const forward = camera.getForwardRay().direction;
  return new BABYLON.Vector3(forward.x, 0, forward.z).normalize();
}

function getCameraRightDirection(camera) {
  const forward = getCameraForwardDirection(camera);
  const right = BABYLON.Vector3.Cross(forward, BABYLON.Vector3.Up());
  return right.normalize();
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
