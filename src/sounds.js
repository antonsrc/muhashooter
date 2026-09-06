import * as BABYLON from "@babylonjs/core";

export async function loadSounds() {
  await BABYLON.CreateAudioEngineAsync();
  
  let res = {};
  res.hitBulletSound = await BABYLON.CreateSoundAsync(
    "gunshot",
    "./bullet.mp3",
  );
  return res;
}
