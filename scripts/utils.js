import { MODULE_SCOPE, TOP_KEY, BOTTOM_KEY } from "./const.js";

export function getTokenLOSheight(token) {
  let losDiff;
  let divideBy = WallHeight._isLevelsAutoCover && token.document.flags.levelsautocover?.ducking ? 3 : 1;
  if (WallHeight._autoLosHeight) {
    losDiff =
      token.document.flags[MODULE_SCOPE]?.tokenHeight ||
      WallHeight._losHeightMulti * canvas.scene.dimensions.distance *
        Math.max(token.document.width, token.document.height) *
        ((Math.abs(token.document.texture.scaleX) + Math.abs(token.document.texture.scaleY)) / 2);
  } else {
    losDiff = token.document.flags[MODULE_SCOPE]?.tokenHeight || WallHeight._defaultTokenHeight;
  }

  return token.document.elevation + losDiff / divideBy;
}

export function getAdvancedLighting(document){
  return game.settings.get(MODULE_SCOPE, 'globalAdvancedLighting') || document.getFlag(MODULE_SCOPE, "advancedLighting")
}

export function getWallBounds(wall) {
    if(wall.document) wall = wall.document;
    const top = wall.flags[MODULE_SCOPE]?.[TOP_KEY] ?? Infinity;
    const bottom = wall.flags[MODULE_SCOPE]?.[BOTTOM_KEY] ?? -Infinity;
    return { top, bottom }
}

export function getLevelsBounds(document){
    const top = document.flags?.levels?.rangeTop ?? Infinity;
    const bottom = document.flags?.levels?.rangeBottom ?? -Infinity;
    return { top, bottom }
}

export function getSceneSettings(scene) {
    let advancedVision = scene.flags[MODULE_SCOPE]?.advancedVision ?? true;
    return {advancedVision};
}

export async function _old_migrateData(scene){
    if(!scene) scene = canvas.scene;
    const walls = Array.from(scene.walls);
    const updates = [];
    for (const wall of walls) {
        const oldTop = wall.document.flags?.wallHeight?.wallHeightTop;
        const oldBottom = wall.document.flags?.wallHeight?.wallHeightBottom;
        if ((oldTop !== null && oldTop !== undefined) || (oldBottom !== null && oldBottom !== undefined)) {
            const update = {
              _id: wall.id,
              flags: {
                "wall-height": {
                  top: oldTop,
                  bottom: oldBottom,
                },
                "-=wallHeight": null
              },
            };
            updates.push(update);
        }
    }
    if(updates.length <= 0) return false;
    await scene.updateEmbeddedDocuments("Wall", updates);
    console.log("Wall Height - Migrated " + updates.length + " walls to new Wall Height data structure in scene " + scene.name);
    return true;

}

export async function migrateData(scene){
  if(!scene) scene = canvas.scene;
  const walls = Array.from(scene.walls);
  const updates = [];
  for (const wall of walls) {
      const oldTop = wall.flags?.wallHeight?.wallHeightTop;
      const oldBottom = wall.flags?.wallHeight?.wallHeightBottom;
      if ((oldTop !== null && oldTop !== undefined) || (oldBottom !== null && oldBottom !== undefined)) {
          const update = {
            _id: wall.id,
            flags: {
              "wall-height": {
                top: oldTop,
                bottom: oldBottom,
              },
              "-=wallHeight": null
            },
          };
    if(wall.flags['token-attacher']){
      const oldOffsetTop = wall.flags?.['token-attacher']?.offset?.elevation?.flags?.wallHeight?.wallHeightTop;
      const oldOffsetBottom = wall.flags?.['token-attacher']?.offset?.elevation?.flags?.wallHeight?.wallHeightBottom;
      if ((oldTop !== null && oldTop !== undefined) || (oldBottom !== null && oldBottom !== undefined)) {
        setProperty(update, `flags.token-attacher.offset.elevation.flags.wall-height`,{
          top: oldOffsetTop,
          bottom: oldOffsetBottom
        });
        setProperty(update, `flags.token-attacher.offset.elevation.flags.-=wallHeight`, null);
      }
    }
    updates.push(update);
      }
  }
  if(updates.length <= 0) return false;
  await scene.updateEmbeddedDocuments("Wall", updates,{'token-attacher': {update:true}});
  ui.notifications.notify("Wall Height - Migrated " + updates.length + " walls to new Wall Height data structure in scene " + scene.name);
  console.log("Wall Height - Migrated " + updates.length + " walls to new Wall Height data structure in scene " + scene.name);
  return true;
}

export async function migrateTokenHeight(){
  ui.notifications.notify("Wall Height - Migrating Token Height from Levels...");
  const scenes = Array.from(game.scenes);
  for(let scene of scenes){
    await migrateTokenHeightInScene(scene);
  }
  const updates = [];
  const actors = Array.from(game.actors);
  for(const actor of actors){
    const oldTokenHeight = actor.document.token.flags?.levels?.tokenHeight
    if (oldTokenHeight) {
      const update = {
        _id: actor.id,
        "token.flags.wall-height.tokenHeight": oldTokenHeight,
      };
      updates.push(update);
    }
  }
  await Actor.updateDocuments(updates)
  ui.notifications.notify("Wall Height - Migrated Token Height from Levels. You can migrate again with the provided macro if needeed.");
  ui.notifications.warn("Global settings for Token Height need to be manually set in Wall Height module settings!", {permanent: true});
}

async function migrateTokenHeightInScene(scene){
  const tokens = Array.from(scene.tokens);
  const updates = [];
  for (const token of tokens) {
      const oldTokenHeight = token.document.flags?.levels?.tokenHeight
      if (oldTokenHeight) {
          const update = {
            _id: token.id,
            flags: {
              "wall-height": {
                tokenHeight: oldTokenHeight,
              },
            },
          };
    updates.push(update);
      }
  }
  if(updates.length <= 0) return false;
  await scene.updateEmbeddedDocuments("Token", updates);
  return true;
}