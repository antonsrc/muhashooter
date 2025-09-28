/**
 * @param {string} playAnim - "idle"
 * @param {string[]} stopAnims - ["walk", "run"]
 * @param {object} animations - object of AnimationGroup
 */
export async function setAnimation(playAnim, stopAnims, animations) {
  if (animations[playAnim].isPlaying) {
    return;
  } else {
    stopAnims.forEach((a) => animations[a].stop());
    animations[playAnim].start(true);
  }
}
