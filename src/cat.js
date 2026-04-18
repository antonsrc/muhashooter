import * as BABYLON from "@babylonjs/core";

import {
  setAnimation,
  setAnimationBlending,
  getAnimationGroups,
} from "./utils.js";

const listStates = {
  walk: "walk",
  idle: "idle",
  run: "run",
  startJump: "startJump",
  jump: "jump",
  fall: "fall",
};

const jumpHeight = 15;

let speed = 1;
const jumpSpeed = 15;
const fallSpeed = 10;
const walkSpeed = 12;

let airFrames = 0;
const fallFramesLimit = 25;

let inputDirection = BABYLON.Vector3.Zero();
let currentState = listStates.idle;
let onGround = false;
const characterHeight = 6;
const characterGravity = new BABYLON.Vector3(0, -30, 0);

export async function loadCat(scene, shadows, pressedKeys, camera) {
  const catGlb = await BABYLON.LoadAssetContainerAsync("./cat.glb", scene);
  const [meshes] = catGlb.meshes;
  const rootContainer = new BABYLON.TransformNode("rootContainer", scene);
  meshes.parent = rootContainer;
  meshes.position.set(0, -characterHeight / 2, 0);

  camera.parent = rootContainer;

  catGlb.meshes.forEach((mesh) => {
    mesh.receiveShadows = true;
  });
  if (shadows) {
    shadows.addShadowCaster(meshes);
  }

  const animations = getAnimationGroups(catGlb, [
    "walk",
    "idle",
    "run",
    "jump",
    "fall",
  ]);
  await setAnimationBlending(catGlb);

  let catController = new BABYLON.PhysicsCharacterController(
    new BABYLON.Vector3(0, characterHeight / 2, 0),
    { capsuleHeight: characterHeight, capsuleRadius: 0.6 },
    scene
  );
  catController.characterMass = 5;

  catGlb.addAllToScene();
  scene.onBeforePhysicsObservable.add(() => {
    if (scene.deltaTime == undefined) return;
    let deltaTime = (scene.deltaTime || 1) / 1000.0;

    let support = catController.checkSupport(deltaTime, BABYLON.Vector3.Down());
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
      position.y.toFixed(2)
    );

    if (pressedKeys["leftMouseButton"] && !pressedKeys.KeyS) {
      const sphere = BABYLON.MeshBuilder.CreateSphere(
        `bullet`,
        { diameter: 0.5, segments: 8 },
        scene
      );

      const material = new BABYLON.StandardMaterial("material", scene);
      material.diffuseColor = new BABYLON.Color3(
        Math.random(),
        Math.random(),
        Math.random()
      );
      sphere.material = material;

      shadows.addShadowCaster(sphere);
      sphere.position.set(position.x, position.y + 4, position.z);

      let sphereAggregate = new BABYLON.PhysicsAggregate(
        sphere,
        BABYLON.PhysicsShapeType.SPHERE,
        { mass: 0.01, restitution: 4 },
        scene
      );

      sphereAggregate.body.applyForce(
        cameraForward.scale(50),
        sphere.absolutePosition
      );

      // Удаляем через 5 секунд
      setTimeout(() => {
        // Удаляем физическое тело
        sphereAggregate.dispose();
        // Удаляем меш
        sphere.dispose();
      }, 5000);
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
        BABYLON.Axis.Y
      );

      BABYLON.Quaternion.SlerpToRef(
        meshes.rotationQuaternion,
        targetRotation,
        10 * deltaTime,
        meshes.rotationQuaternion
      );
    }

    const desiredLinearVelocity = getDesiredVelocity(
      deltaTime,
      catController.getVelocity(),
      animations,
      currentState
    );
    catController.setVelocity(desiredLinearVelocity);
    catController.integrate(deltaTime, support, characterGravity);
    meshes.parent.position.copyFrom(catController.getPosition());
  });
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
    case listStates.idle:
      if (onGround) {
        inputDirection = BABYLON.Vector3.Zero();
        catController.setVelocity(
          new BABYLON.Vector3(velocity.x, 0, velocity.z)
        );
      }
      if (idleCondition) {
        return listStates.idle;
      }
      if (walkCondition) {
        return listStates.walk;
      }
      if (runCondition) {
        return listStates.run;
      }
      if (jumpCondition) {
        return listStates.startJump;
      }
      if (fallCondition) {
        return listStates.fall;
      }
      return listStates.idle;
    case listStates.walk:
      if (onGround) {
        speed = 1;
        inputDirection = BABYLON.Vector3.Zero();
        catController.setVelocity(
          new BABYLON.Vector3(velocity.x, 0, velocity.z)
        );
      }
      if (idleCondition) {
        return listStates.idle;
      }
      if (jumpCondition) {
        return listStates.startJump;
      }
      if (walkCondition) {
        return listStates.walk;
      }
      if (runCondition) {
        return listStates.run;
      }
      if (fallCondition) {
        return listStates.fall;
      }

      return listStates.walk;
    case listStates.run:
      if (onGround) {
        speed = 3;
        inputDirection = BABYLON.Vector3.Zero();
        catController.setVelocity(
          new BABYLON.Vector3(velocity.x, 0, velocity.z)
        );
      }
      if (idleCondition) {
        return listStates.idle;
      }
      if (jumpCondition) {
        return listStates.startJump;
      }
      if (runCondition) {
        return listStates.run;
      }
      if (fallCondition) {
        return listStates.fall;
      }

      if (walkCondition) {
        return listStates.walk;
      }
      return listStates.run;
    case listStates.startJump:
      // условие для наклонных поверхностей от ложных анимаций прыжка,
      // когда персонаж поднимается в гору и одновременно нажата клавиша Space
      if (velocity.y == jumpHeight) {
        return listStates.jump;
      }
    case listStates.jump:
      if (onGround) {
        if (!canMoving) {
          return listStates.idle;
        } else if (!pressedKeys.ShiftLeft) {
          return listStates.walk;
        } else {
          return listStates.run;
        }
      }
      if (fallCondition) {
        inputDirection = BABYLON.Vector3.Zero();
        return listStates.fall;
      }

      return listStates.jump;

    case listStates.fall:
      if (onGround) {
        if (!canMoving) {
          return listStates.idle;
        } else if (!pressedKeys.ShiftLeft) {
          return listStates.walk;
        } else {
          return listStates.run;
        }
      } else {
        inputDirection = BABYLON.Vector3.Zero();
        return listStates.fall;
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
  if (supportInfo.supportedState == BABYLON.CharacterSupportedState.SUPPORTED) {
    return true;
  }
  return false;
}

function getDesiredVelocity(
  deltaTime,
  currentVelocity,
  animations,
  currentState
) {
  const fallVerticalVelocity =
    currentVelocity.y + characterGravity.y * deltaTime;

  switch (currentState) {
    case listStates.idle:
      setAnimation("idle", ["walk", "run", "jump", "fall"], animations);
      return BABYLON.Vector3.Zero();
    case listStates.walk:
      setAnimation("walk", ["idle", "run", "jump", "fall"], animations);
      return inputDirection.scale(walkSpeed * speed);
    case listStates.run:
      setAnimation("run", ["idle", "walk", "jump", "fall"], animations);
      return inputDirection.scale(walkSpeed * speed);
    case listStates.startJump:
      return inputDirection
        .scale(jumpSpeed * speed)
        .addInPlace(BABYLON.Vector3.Up().scale(jumpHeight));
    case listStates.jump:
      setAnimation("jump", ["idle", "run", "walk", "fall"], animations, false);
      return inputDirection
        .scale(jumpSpeed * speed)
        .addInPlace(new BABYLON.Vector3(0, fallVerticalVelocity, 0));
    case listStates.fall:
      if (airFrames > fallFramesLimit) {
        setAnimation("fall", ["idle", "walk", "jump", "run"], animations);
      }
      return inputDirection
        .scale(fallSpeed * speed)
        .addInPlace(new BABYLON.Vector3(0, fallVerticalVelocity, 0));
  }
}
