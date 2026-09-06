import * as BABYLON from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/inspector";

import { initInputDevices } from "./input-manager.js";

import { loadCat } from "./cat.js";
import { loadTrees } from "./trees.js";
import { loadGrass } from "./grass.js";
import { loadSounds } from "./sounds.js";

import { createCamera } from "./camera.js";
import { createLight, setLightningEnvironment } from "./light.js";
import { createShadows } from "./shadows.js";
import { createGround } from "./groundFromHeightMap.js";
// import { createGround } from "./ground.js";
import { createBoxZebra } from "./box-zebra.js";
import { createEnemy } from "./enemy.js";

import { createBullets } from "./bullet.js";
import { setAnimation } from "./utils.js";

const keys = {};

const catValues = {
  lastSpeed: 16,
  walkSpeed: 16,
  runSpeed: 40,
  jumpHeight: 25,
  framesInAirMax: 20,
};

const catStates = {
  canShoot: true,
  onGround: false,
  current: "idle",
  framesInAir: 0,
};

const catBullets = {
  inAir: [],
  firingRate: 200,
};

const ground = {
  size: 700,
};

let inputDirection = BABYLON.Vector3.Zero();
const characterGravity = new BABYLON.Vector3(0, -30, 0);

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

  const groundFromHeightMap = await createGround(scene, { size: ground.size });
  createBoxZebra(scene, shadows);

  await loadTrees(scene, ground.size / 2 - 2, groundFromHeightMap);
  await loadGrass(scene, ground.size / 2 - 2, groundFromHeightMap);

  const { meshes, catController, animations } = await loadCat(
    scene,
    shadows,
    keys,
    camera,
  );

  const enemy = await createEnemy(scene, shadows);

  const sounds = await loadSounds();

  scene.onBeforePhysicsObservable.add(async () => {
    if (scene.deltaTime == undefined) return;
    const dt = (scene.deltaTime || 1) / 1000;

    const cameraForward = getCameraForwardDirection(camera);
    const cameraRight = getCameraRightDirection(camera);

    const catSurface = catController.checkSupport(dt, BABYLON.Vector3.Down());
    catStates.onGround = getState(catSurface);

    const velocity = catController.getVelocity();
    const position = catController.getPosition();

    catStates.current = getNewState(scene, catController, velocity);

    console.log(
      catStates.current,
      "\t",
      catStates.onGround,
      "\t",
      velocity.y.toFixed(1),
      "\t",
      position.y.toFixed(2),
    );

    if (keys.leftMouseButton && !keys.KeyS && catStates.canShoot) {
      catStates.canShoot = false;
      setTimeout(() => (catStates.canShoot = true), catBullets.firingRate); // Скорострельность

      const spawnPos = new BABYLON.Vector3(
        position.x,
        position.y + 2,
        position.z,
      );

      // Создаем пулю и сразу получаем данные для ручного движения
      const bulletData = createBullets(scene, spawnPos, cameraForward);
      catBullets.inAir.push(bulletData);
    }

    for (let i = catBullets.inAir.length - 1; i >= 0; i--) {
      const bullet = catBullets.inAir[i];

      if (!bullet || !bullet.mesh) {
        catBullets.inAir.splice(i, 1);
        continue;
      }

      // А) Двигаем пулю вручную: позиция += (вектор скорости * время кадра)
      bullet.mesh.position.addInPlace(bullet.velocity.scale(dt));

      // Б) Проверяем время жизни пули (например, 3 секунды), чтобы не засорять память
      if (Date.now() - bullet.createdAt > 3000) {
        bullet.mesh.dispose();
        catBullets.inAir.splice(i, 1);
        continue; // Переходим к следующей пуле
      }

      // В) Проверяем попадание
      if (enemy.mesh && !enemy.mesh.isDisposed() && enemy.hp > 0) {
        if (bullet.mesh.intersectsMesh(enemy.mesh, false)) {
          console.log("🎯 ПОПАДАНИЕ!");

          sounds.hitBulletSound.play({ loop: false });
          const randomPitch = 0.9 + Math.random() * 0.2;
          sounds.hitBulletSound.playbackRate = randomPitch;

          // Уничтожаем пулю
          bullet.mesh.dispose();
          catBullets.inAir.splice(i, 1);

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

    if (keys.KeyW) inputDirection.addInPlace(cameraForward);
    if (keys.KeyS) inputDirection.addInPlace(cameraForward.scale(-1));
    if (keys.KeyD) inputDirection.addInPlace(cameraRight);
    if (keys.KeyA) inputDirection.addInPlace(cameraRight.scale(-1));

    inputDirection.normalize();

    if (inputDirection.length() > 0.1) {
      const targetRotation = BABYLON.Quaternion.FromLookDirectionLH(
        inputDirection,
        BABYLON.Axis.Y,
      );

      BABYLON.Quaternion.SlerpToRef(
        meshes.rotationQuaternion,
        targetRotation,
        10 * dt,
        meshes.rotationQuaternion,
      );
    }

    const desiredLinearVelocity = getDesiredVelocity(dt, velocity, animations);
    catController.setVelocity(desiredLinearVelocity);
    catController.integrate(dt, catSurface, characterGravity);
    meshes.parent.position.copyFrom(position);

    if (enemy.isMoving && enemy.targetPosition) {
      // 1. Находим вектор направления от врага к цели
      enemy.targetPosition.copyFrom(position);
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
        const moveStep = direction.scale(enemy.speed * dt);
        enemy.mesh.position.addInPlace(moveStep);

        // (Опционально) Поворачиваем врага в сторону движения для красоты
        const targetRotation = BABYLON.Quaternion.FromLookDirectionLH(
          direction,
          BABYLON.Axis.Y,
        );
        BABYLON.Quaternion.SlerpToRef(
          enemy.mesh.rotationQuaternion || new BABYLON.Quaternion(),
          targetRotation,
          10 * dt,
          enemy.mesh.rotationQuaternion || new BABYLON.Quaternion(),
        );
      }
    }
  });

  initEventListeners(engine);
  initInputDevices(scene, canvas, keys);

  engine.runRenderLoop(() => scene.render());
}

function initEventListeners(engine) {
  window.addEventListener("resize", () => engine.resize());
}

function getNewState(scene, catController, velocity) {
  const canMoving = keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD;
  let idleCondition = catStates.onGround && !canMoving && !keys.Space;
  let walkCondition =
    catStates.onGround && canMoving && !keys.Space && !keys.ShiftLeft;
  let runCondition =
    catStates.onGround && canMoving && !keys.Space && keys.ShiftLeft;
  let jumpCondition = catStates.onGround && keys.Space;
  let fallCondition =
    !catStates.onGround && !scene.getAnimationGroupByName("jump").isPlaying;

  if (fallCondition) {
    catStates.framesInAir++;
  } else {
    catStates.framesInAir = 0;
  }

  switch (catStates.current) {
    case "idle":
      if (catStates.onGround) {
        inputDirection = BABYLON.Vector3.Zero();
        catController.setVelocity(
          new BABYLON.Vector3(velocity.x, 0, velocity.z),
        );
      }
      if (idleCondition) {
        return "idle";
      }
      if (walkCondition) {
        return "walk";
      }
      if (runCondition) {
        return "run";
      }
      if (jumpCondition) {
        return "startJump";
      }
      if (fallCondition) {
        return "fall";
      }
      return "idle";
    case "walk":
      if (catStates.onGround) {
        inputDirection = BABYLON.Vector3.Zero();
        catController.setVelocity(
          new BABYLON.Vector3(velocity.x, 0, velocity.z),
        );
      }
      if (idleCondition) {
        return "idle";
      }
      if (jumpCondition) {
        return "startJump";
      }
      if (walkCondition) {
        return "walk";
      }
      if (runCondition) {
        return "run";
      }
      if (fallCondition) {
        return "fall";
      }

      return "walk";
    case "run":
      if (catStates.onGround) {
        inputDirection = BABYLON.Vector3.Zero();
        catController.setVelocity(
          new BABYLON.Vector3(velocity.x, 0, velocity.z),
        );
      }
      if (idleCondition) {
        return "idle";
      }
      if (jumpCondition) {
        return "startJump";
      }
      if (runCondition) {
        return "run";
      }
      if (fallCondition) {
        return "fall";
      }

      if (walkCondition) {
        return "walk";
      }
      return "run";
    case "startJump":
      // условие для наклонных поверхностей от ложных анимаций прыжка,
      // когда персонаж поднимается в гору и одновременно нажата клавиша Space
      if (velocity.y == catValues.jumpHeight) {
        return "jump";
      }
    case "jump":
      if (catStates.onGround) {
        if (!canMoving) {
          return "idle";
        } else if (!keys.ShiftLeft) {
          return "walk";
        } else {
          return "run";
        }
      }
      if (fallCondition) {
        inputDirection = BABYLON.Vector3.Zero();
        return "fall";
      }

      return "jump";

    case "fall":
      if (catStates.onGround) {
        if (!canMoving) {
          return "idle";
        } else if (!keys.ShiftLeft) {
          return "walk";
        } else {
          return "run";
        }
      } else {
        inputDirection = BABYLON.Vector3.Zero();
        return "fall";
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

function getDesiredVelocity(dt, currentVelocity, animations) {
  const fallVerticalVelocity = currentVelocity.y + characterGravity.y * dt;

  switch (catStates.current) {
    case "idle":
      setAnimation("idle", ["walk", "run", "jump", "fall"], animations);
      return BABYLON.Vector3.Zero();
    case "walk":
      setAnimation("walk", ["idle", "run", "jump", "fall"], animations);
      catValues.lastSpeed = catValues.walkSpeed;
      return inputDirection.scale(catValues.walkSpeed);
    case "run":
      setAnimation("run", ["idle", "walk", "jump", "fall"], animations);
      catValues.lastSpeed = catValues.runSpeed;
      return inputDirection.scale(catValues.runSpeed);
    case "startJump":
      return inputDirection
        .scale(catValues.lastSpeed)
        .addInPlace(BABYLON.Vector3.Up().scale(catValues.jumpHeight));
    case "jump":
      setAnimation("jump", ["idle", "run", "walk", "fall"], animations, false);
      return inputDirection
        .scale(catValues.lastSpeed)
        .addInPlace(new BABYLON.Vector3(0, fallVerticalVelocity, 0));
    case "fall":
      if (catStates.framesInAir > catValues.framesInAirMax) {
        setAnimation("fall", ["idle", "walk", "jump", "run"], animations);
      }
      return inputDirection
        .scale(catValues.lastSpeed)
        .addInPlace(new BABYLON.Vector3(0, fallVerticalVelocity, 0));
  }
}
