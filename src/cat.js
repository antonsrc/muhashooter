import * as BABYLON from "@babylonjs/core";
import {
  setAnimation,
  setAnimationBlending,
  getAnimationGroups,
} from "./utils.js";

const upWorld = BABYLON.Vector3.Up();
const listStates = {
  walk: "walk",
  idle: "idle",
  run: "run",
  startJump: "startJump",
  jump: "jump",
  fall: "fall",
};

const inAirSpeed = 10;
const onGroundSpeed = 12;
const jumpHeight = 12;
let speed = 1;

let inputDirection = BABYLON.Vector3.Zero();
let onGround = false;
let characterGravity = new BABYLON.Vector3(0, -18, 0);
let currentState = listStates.idle;

export async function loadCat(scene, shadows, pressedKeys, camera) {
  const catGlb = await BABYLON.LoadAssetContainerAsync("./cat.glb", scene);
  const [meshes] = catGlb.meshes;
  const rootContainer = new BABYLON.TransformNode("rootContainer", scene);
  meshes.parent = rootContainer;
  camera.parent = rootContainer;
  shadows.addShadowCaster(meshes);
  catGlb.addAllToScene();

  const animations = getAnimationGroups(catGlb, [
    "walk",
    "idle",
    "run",
    "jump",
  ]);
  await setAnimationBlending(catGlb);

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

    currentState = getNewState(currentState, canMoving, pressedKeys, scene);

    
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

function getNewState(currentState, canMoving, pressedKeys, scene) {
  switch (currentState) {
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

function getDesiredVelocity(
  deltaTime,
  currentVelocity,
  animations,
  currentState
) {
  switch (currentState) {
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
