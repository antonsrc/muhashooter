import * as BABYLON from "@babylonjs/core";
import {
  setAnimation,
  setAnimationBlending,
  getAnimationGroups,
} from "./utils.js";

let inputDirection = BABYLON.Vector3.Zero();
let onGround = false;
let upWorld = BABYLON.Vector3.Up();
let speed = 1;
let inAirSpeed = 8.0;
let onGroundSpeed = 10.0;
let jumpHeight = 12;
let characterGravity = new BABYLON.Vector3(0, -18, 0);

const listStates = {
  walk: "walk",
  idle: "idle",
  run: "run",
  startJump: "startJump",
  jump: "jump",
  fall: "fall",
};
let oldState = listStates.idle;
let newState = listStates.idle;

export async function loadCat(scene, shadows, pressedKeys, camera) {
  const catGlb = await BABYLON.LoadAssetContainerAsync("./cat.glb", scene);
  const [meshes] = catGlb.meshes;
  const rootContainer = new BABYLON.TransformNode("rootContainer", scene);
  meshes.parent = rootContainer;
  camera.parent = rootContainer;

  const animations = getAnimationGroups(catGlb, [
    "walk",
    "idle",
    "run",
    "jump",
  ]);
  await setAnimationBlending(catGlb);

  shadows.addShadowCaster(meshes);
  catGlb.addAllToScene();

  const catHeight = 6;
  meshes.position.set(0, -catHeight / 2, 0);

  let catController = new BABYLON.PhysicsCharacterController(
    new BABYLON.Vector3(0, catHeight / 2, 0),
    { capsuleHeight: catHeight, capsuleRadius: 1.4 },
    scene
  );

  scene.onBeforePhysicsObservable.add(() => {
    if (scene.deltaTime == undefined) return;
    let deltaTime = (scene.deltaTime || 1) / 1000.0;

    let support = catController.checkSupport(deltaTime, BABYLON.Vector3.Down());
    onGround = getState(support);

    const cameraForward = getCameraForwardDirection(camera);
    const cameraRight = getCameraRightDirection(camera);

    const canMoving =
      pressedKeys.KeyW ||
      pressedKeys.KeyA ||
      pressedKeys.KeyS ||
      pressedKeys.KeyD;

    newState = getNewState(oldState, canMoving, pressedKeys, scene);

    if (!canMoving) {
      inputDirection = BABYLON.Vector3.Zero();
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

    let desiredLinearVelocity = getDesiredVelocity(
      deltaTime,
      catController.getVelocity(),
      animations
    );
    catController.setVelocity(desiredLinearVelocity);
    catController.integrate(deltaTime, support, characterGravity);
    meshes.parent.position.copyFrom(catController.getPosition());

    console.log(
      `ground`,
      onGround,
      `, move`,
      canMoving,
      `| ${oldState} -> ${newState}`,
      `, y`,
      desiredLinearVelocity.y
    );

    oldState = newState; // потом это убрать
  });
}

function getNewState(oldState, canMoving, pressedKeys, scene) {
  switch (oldState) {
    case listStates.idle:
      if (onGround && canMoving) {
        return listStates.walk;
      }
      if (onGround && pressedKeys.Space) {
        return listStates.startJump;
      }
      if (!onGround) {
        return listStates.fall;
      }
      return listStates.idle;
    case listStates.walk:
      speed = 1;
      if (onGround && !canMoving) {
        return listStates.idle;
      }
      if (onGround && pressedKeys.Space) {
        return listStates.startJump;
      }
      if (!onGround) {
        return listStates.fall;
      }
      if (onGround && canMoving && pressedKeys.ShiftLeft) {
        return listStates.run;
      }
      return listStates.walk;
    case listStates.run:
      speed = 3;
      if (onGround && !canMoving) {
        return listStates.idle;
      }
      if (onGround && pressedKeys.Space) {
        return listStates.startJump;
      }
      if (!onGround) {
        return listStates.fall;
      }
      if (onGround && canMoving && !pressedKeys.ShiftLeft) {
        return listStates.walk;
      }
      return listStates.run;
    case listStates.startJump:
      if (scene.getAnimationGroupByName("jump").isPlaying) {
        return listStates.jump;
      }
    case listStates.jump:
      if (onGround && !canMoving) {
        return listStates.idle;
      }
      if (onGround && canMoving && !pressedKeys.ShiftLeft) {
        return listStates.walk;
      }
      if (onGround && canMoving && pressedKeys.ShiftLeft) {
        return listStates.run;
      }
      if (!onGround && !scene.getAnimationGroupByName("jump").isPlaying) {
        return listStates.fall;
      }
      return listStates.jump;
    case listStates.fall:
      if (onGround && !canMoving) {
        return listStates.idle;
      }
      if (onGround && canMoving && !pressedKeys.ShiftLeft) {
        return listStates.walk;
      }
      if (onGround && canMoving && pressedKeys.ShiftLeft) {
        return listStates.run;
      }
      return listStates.fall;
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

function getDesiredVelocity(deltaTime, currentVelocity, animations) {
  switch (newState) {
    case listStates.idle:
      setAnimation("idle", ["walk", "run", "jump"], animations);
      return BABYLON.Vector3.Zero();
    case listStates.walk:
      setAnimation("walk", ["idle", "run", "jump"], animations);
      return inputDirection.scale(onGroundSpeed * speed);
    case listStates.run:
      setAnimation("run", ["idle", "walk", "jump"], animations);
      return inputDirection.scale(onGroundSpeed * speed);
    case listStates.startJump:
      setAnimation("jump", ["idle", "run", "walk"], animations, false);
      return inputDirection
        .scale(inAirSpeed * speed)
        .addInPlace(upWorld.scale(jumpHeight));
    case listStates.jump:
      return inputDirection
        .scale(inAirSpeed * speed)
        .addInPlace(upWorld.scale(currentVelocity.dot(upWorld)))
        .addInPlace(characterGravity.scale(deltaTime));
    case listStates.fall:
      return inputDirection
        .scale(inAirSpeed * speed)
        .addInPlace(upWorld.scale(currentVelocity.dot(upWorld)))
        .addInPlace(characterGravity.scale(deltaTime * 2));
  }
}
