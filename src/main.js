import * as BABYLON from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/inspector";

import { initInputDevices } from "./input-manager.js";

import { loadCat } from "./cat.js";
import { loadTrees } from "./trees.js";
import { loadGrass } from "./grass.js";

import { createCamera } from "./camera.js";
import { createLight, setLightningEnvironment } from "./light.js";
import { createShadows } from "./shadows.js";
import { createGround } from "./groundFromHeightMap.js";
// import { createGround } from "./ground.js";
import { createBoxZebra } from "./box-zebra.js";
import { createEnemy } from "./enemy.js";

import { createBullets } from "./bullet.js";
import { setAnimation } from "./utils.js";

const catStates = {
  walk: "walk",
  idle: "idle",
  run: "run",
  startJump: "startJump",
  jump: "jump",
  fall: "fall",
};

const catValues = {
  lastSpeed: 16,
  walkSpeed: 16,
  runSpeed: 40,
  jumpHeight: 25,
};

let canShoot = true;

let airFrames = 0;
const fallFramesLimit = 25;

let inputDirection = BABYLON.Vector3.Zero();
let currentState = catStates.idle;
let onGround = false;
const characterGravity = new BABYLON.Vector3(0, -30, 0);

const activeBullets = [];

let hitBulletSound = null;

const pressedKeys = {};

const ground = {
  size: 700,
};

init().catch(console.error);

async function init() {
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(
    canvas,
    false,
    { stencil: false, antialias: true },
    true,
  );
  const scene = new BABYLON.Scene(engine);
  const camera = createCamera(scene);

  const havok = new BABYLON.HavokPlugin(true, await HavokPhysics());
  scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0), havok);

  const light = createLight(scene);
  const shadows = createShadows(light);
  setLightningEnvironment(scene);

  let groundFromHeightMap = await createGround(scene, { size: ground.size });
  createBoxZebra(scene, shadows);
  const enemy = await createEnemy(scene, shadows);

  await loadTrees(scene, ground.size / 2 - 2, groundFromHeightMap);
  await loadGrass(scene, ground.size / 2 - 2, groundFromHeightMap);

  await BABYLON.CreateAudioEngineAsync();
  hitBulletSound = await BABYLON.CreateSoundAsync("gunshot", "./bullet.mp3");

  const { meshes, catController, animations } = await loadCat(
    scene,
    shadows,
    pressedKeys,
    camera,
  );

  scene.onBeforePhysicsObservable.add(async () => {
    if (scene.deltaTime == undefined) return;
    let deltaTime = (scene.deltaTime || 1) / 1000;

    const support = catController.checkSupport(
      deltaTime,
      BABYLON.Vector3.Down(),
    );
    onGround = getState(support);

    const cameraForward = getCameraForwardDirection(camera);
    const cameraRight = getCameraRightDirection(camera);

    let oldState = currentState;

    currentState = getNewState(currentState, pressedKeys, scene, catController);

    const velocity = catController.getVelocity();
    const position = catController.getPosition();
    console.log(
      oldState,
      "->",
      currentState,
      "\t",
      onGround,
      "\t",
      velocity.y.toFixed(1),
      "\t",
      position.y.toFixed(2),
    );

    if (enemy.isMoving && enemy.targetPosition) {
      // 1. Находим вектор направления от врага к цели
      enemy.targetPosition.copyFrom(catController.getPosition());
      const direction = enemy.targetPosition.subtract(enemy.mesh.position);

      // 2. Вычисляем расстояние до цели
      const distanceToTarget = direction.length();

      // 3. Если мы почти пришли (ближе чем 0.1 единицы), останавливаемся
      if (distanceToTarget < 0.1) {
        enemy.isMoving = false;
        enemy.mesh.position.copyFrom(enemy.targetPosition); // Выравниваем точно в цель
        console.log("Враг достиг цели!");

        // ТУТ МОЖНО ЗАПУСТИТЬ АТАКУ ИЛИ СЛЕДУЮЩЕЕ ДЕЙСТВИЕ
      } else {
        // 4. Если не дошли: нормализуем направление (делаем длину вектора = 1)
        direction.normalize();

        // 5. Двигаем врага: направление * скорость * время кадра
        const moveStep = direction.scale(enemy.speed * deltaTime);
        enemy.mesh.position.addInPlace(moveStep);

        // (Опционально) Поворачиваем врага в сторону движения для красоты
        const targetRotation = BABYLON.Quaternion.FromLookDirectionLH(
          direction,
          BABYLON.Axis.Y,
        );
        BABYLON.Quaternion.SlerpToRef(
          enemy.mesh.rotationQuaternion || new BABYLON.Quaternion(),
          targetRotation,
          10 * deltaTime,
          enemy.mesh.rotationQuaternion || new BABYLON.Quaternion(),
        );
      }
    }

    if (pressedKeys["leftMouseButton"] && !pressedKeys.KeyS && canShoot) {
      canShoot = false;
      setTimeout(() => {
        canShoot = true;
      }, 300); // Скорострельность

      const spawnPos = new BABYLON.Vector3(
        position.x,
        position.y + 2,
        position.z,
      );

      // Создаем пулю и сразу получаем данные для ручного движения
      const bulletData = createBullets(scene, spawnPos, cameraForward);
      activeBullets.push(bulletData);
    }

    for (let i = activeBullets.length - 1; i >= 0; i--) {
      const bullet = activeBullets[i];

      if (!bullet || !bullet.mesh) {
        activeBullets.splice(i, 1);
        continue;
      }

      // А) Двигаем пулю вручную: позиция += (вектор скорости * время кадра)
      bullet.mesh.position.addInPlace(bullet.velocity.scale(deltaTime));

      // Б) Проверяем время жизни пули (например, 3 секунды), чтобы не засорять память
      if (Date.now() - bullet.createdAt > 3000) {
        bullet.mesh.dispose();
        activeBullets.splice(i, 1);
        continue; // Переходим к следующей пуле
      }

      // В) Проверяем попадание
      if (enemy.mesh && !enemy.mesh.isDisposed() && enemy.hp > 0) {
        if (bullet.mesh.intersectsMesh(enemy.mesh, false)) {
          console.log("🎯 ПОПАДАНИЕ!");

          hitBulletSound.play({ loop: false });
          const randomPitch = 0.9 + Math.random() * 0.2;
          hitBulletSound.playbackRate = randomPitch;

          // Уничтожаем пулю
          bullet.mesh.dispose();
          activeBullets.splice(i, 1);

          enemy.hp -= 1;
          if (enemy.hp == 0) {
            enemy.mesh.dispose();
          }

          const originalScale = enemy.mesh.scaling.clone();
          const hitScale = originalScale.scale(1.1);

          // Резко увеличиваем врага прямо сейчас
          enemy.mesh.scaling.copyFrom(hitScale);

          // Плавно возвращаем к нормальному размеру за 0.25 секунды (15 кадров при 60 FPS)
          BABYLON.Animation.CreateAndStartAnimation(
            "bounceBack",
            enemy.mesh,
            "scaling",
            60, // Кадров в секунду
            15, // Длительность анимации в кадрах
            hitScale,
            originalScale,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            new BABYLON.SineEase(),
          );

          break; // Одна пуля попадает только в одного врага
        }
      }
    }

    if (pressedKeys.KeyW) {
      inputDirection.addInPlace(cameraForward);
    }
    if (pressedKeys.KeyS) {
      inputDirection.addInPlace(cameraForward.scale(-1));
    }
    if (pressedKeys.KeyD) {
      inputDirection.addInPlace(cameraRight);
    }
    if (pressedKeys.KeyA) {
      inputDirection.addInPlace(cameraRight.scale(-1));
    }

    inputDirection.normalize();

    if (inputDirection.length() > 0.1) {
      const targetRotation = BABYLON.Quaternion.FromLookDirectionLH(
        inputDirection,
        BABYLON.Axis.Y,
      );

      BABYLON.Quaternion.SlerpToRef(
        meshes.rotationQuaternion,
        targetRotation,
        10 * deltaTime,
        meshes.rotationQuaternion,
      );
    }

    const desiredLinearVelocity = getDesiredVelocity(
      deltaTime,
      catController.getVelocity(),
      animations,
      currentState,
    );
    catController.setVelocity(desiredLinearVelocity);
    catController.integrate(deltaTime, support, characterGravity);
    meshes.parent.position.copyFrom(catController.getPosition());
  });

  initEventListeners(engine);
  initInputDevices(scene, canvas, pressedKeys);

  engine.runRenderLoop(() => scene.render());
}

function initEventListeners(engine) {
  window.addEventListener("resize", () => engine.resize());
}

function getNewState(currentState, pressedKeys, scene, catController) {
  const velocity = catController.getVelocity();

  const canMoving =
    pressedKeys.KeyW ||
    pressedKeys.KeyA ||
    pressedKeys.KeyS ||
    pressedKeys.KeyD;
  let idleCondition = onGround && !canMoving && !pressedKeys.Space;
  let walkCondition =
    onGround && canMoving && !pressedKeys.Space && !pressedKeys.ShiftLeft;
  let runCondition =
    onGround && canMoving && !pressedKeys.Space && pressedKeys.ShiftLeft;
  let jumpCondition = onGround && pressedKeys.Space;
  let fallCondition =
    !onGround && !scene.getAnimationGroupByName("jump").isPlaying;

  if (fallCondition) {
    airFrames++;
  } else {
    airFrames = 0;
  }

  switch (currentState) {
    case catStates.idle:
      if (onGround) {
        inputDirection = BABYLON.Vector3.Zero();
        catController.setVelocity(
          new BABYLON.Vector3(velocity.x, 0, velocity.z),
        );
      }
      if (idleCondition) {
        return catStates.idle;
      }
      if (walkCondition) {
        return catStates.walk;
      }
      if (runCondition) {
        return catStates.run;
      }
      if (jumpCondition) {
        return catStates.startJump;
      }
      if (fallCondition) {
        return catStates.fall;
      }
      return catStates.idle;
    case catStates.walk:
      if (onGround) {
        inputDirection = BABYLON.Vector3.Zero();
        catController.setVelocity(
          new BABYLON.Vector3(velocity.x, 0, velocity.z),
        );
      }
      if (idleCondition) {
        return catStates.idle;
      }
      if (jumpCondition) {
        return catStates.startJump;
      }
      if (walkCondition) {
        return catStates.walk;
      }
      if (runCondition) {
        return catStates.run;
      }
      if (fallCondition) {
        return catStates.fall;
      }

      return catStates.walk;
    case catStates.run:
      if (onGround) {
        inputDirection = BABYLON.Vector3.Zero();
        catController.setVelocity(
          new BABYLON.Vector3(velocity.x, 0, velocity.z),
        );
      }
      if (idleCondition) {
        return catStates.idle;
      }
      if (jumpCondition) {
        return catStates.startJump;
      }
      if (runCondition) {
        return catStates.run;
      }
      if (fallCondition) {
        return catStates.fall;
      }

      if (walkCondition) {
        return catStates.walk;
      }
      return catStates.run;
    case catStates.startJump:
      // условие для наклонных поверхностей от ложных анимаций прыжка,
      // когда персонаж поднимается в гору и одновременно нажата клавиша Space
      if (velocity.y == catValues.jumpHeight) {
        return catStates.jump;
      }
    case catStates.jump:
      if (onGround) {
        if (!canMoving) {
          return catStates.idle;
        } else if (!pressedKeys.ShiftLeft) {
          return catStates.walk;
        } else {
          return catStates.run;
        }
      }
      if (fallCondition) {
        inputDirection = BABYLON.Vector3.Zero();
        return catStates.fall;
      }

      return catStates.jump;

    case catStates.fall:
      if (onGround) {
        if (!canMoving) {
          return catStates.idle;
        } else if (!pressedKeys.ShiftLeft) {
          return catStates.walk;
        } else {
          return catStates.run;
        }
      } else {
        inputDirection = BABYLON.Vector3.Zero();
        return catStates.fall;
      }
  }
}

function getCameraForwardDirection(camera) {
  const forward = camera.getForwardRay().direction;
  return new BABYLON.Vector3(forward.x, 0, forward.z).normalize();
}

function getCameraRightDirection(camera) {
  const forward = getCameraForwardDirection(camera);
  return BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), forward).normalize();
}

function getState(supportInfo) {
  /* 
  BABYLON.CharacterSupportedState.UNSUPPORTED = 0
  BABYLON.CharacterSupportedState.SLIDING = 1 
  BABYLON.CharacterSupportedState.SUPPORTED = 2
  */
  if (supportInfo.supportedState == BABYLON.CharacterSupportedState.SUPPORTED) {
    return true;
  }
  return false;
}

function getDesiredVelocity(
  deltaTime,
  currentVelocity,
  animations,
  currentState,
) {
  const fallVerticalVelocity =
    currentVelocity.y + characterGravity.y * deltaTime;

  switch (currentState) {
    case catStates.idle:
      setAnimation("idle", ["walk", "run", "jump", "fall"], animations);
      return BABYLON.Vector3.Zero();
    case catStates.walk:
      setAnimation("walk", ["idle", "run", "jump", "fall"], animations);
      catValues.lastSpeed = catValues.walkSpeed;
      return inputDirection.scale(catValues.walkSpeed);
    case catStates.run:
      setAnimation("run", ["idle", "walk", "jump", "fall"], animations);
      catValues.lastSpeed = catValues.runSpeed;
      return inputDirection.scale(catValues.runSpeed);
    case catStates.startJump:
      return inputDirection
        .scale(catValues.lastSpeed)
        .addInPlace(BABYLON.Vector3.Up().scale(catValues.jumpHeight));
    case catStates.jump:
      setAnimation("jump", ["idle", "run", "walk", "fall"], animations, false);
      return inputDirection
        .scale(catValues.lastSpeed)
        .addInPlace(new BABYLON.Vector3(0, fallVerticalVelocity, 0));
    case catStates.fall:
      if (airFrames > fallFramesLimit) {
        setAnimation("fall", ["idle", "walk", "jump", "run"], animations);
      }
      return inputDirection
        .scale(catValues.lastSpeed)
        .addInPlace(new BABYLON.Vector3(0, fallVerticalVelocity, 0));
  }
}
