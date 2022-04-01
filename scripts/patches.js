import { getWallBounds,getSceneSettings,migrateData } from "./utils.js";

const MODULE_ID = "wall-height";

class WallHeightUtils{
  constructor(){
    this._currentTokenElevation = null;
    this.isLevels = game.modules.get("levels")?.active;
  }

  set currentTokenElevation(elevation){
    if(elevation === this._currentTokenElevation) return;
    this._currentTokenElevation = elevation;
    this.scheduleUpdate();
  }

  get currentTokenElevation(){
    return this._currentTokenElevation;
  }

  scheduleUpdate(){
    canvas.perception.schedule({
      lighting: { initialize: true, refresh: true },
      sight: { initialize: true, refresh: true, forceUpdateFog: true },
      sounds: { initialize: true, refresh: true },
      foreground: { refresh: true }
    });
  }

  updateElevations(token) {
    if(!token._controlled && !token.object?._controlled) return;
    this.currentTokenElevation =
      WallHeight.isLevels && _levels?.advancedLOS
        ? _levels.getTokenLOSheight(token)
        : token.data.elevation;
  }

  async migrateData(scene){
    return await migrateData(scene);
  }

  async migrateCompendiums (){
      let migratedScenes = 0;
      const compendiums = Array.from(game.packs).filter(p => p.documentName === 'Scene');
      for (const compendium of compendiums) {
        const scenes = await compendium.getDocuments();
        for(const scene of scenes){
          const migrated = await migrateData(scene);
          if(migrated) migratedScenes++;
        }
      }
      if(migratedScenes > 0){
          ui.notifications.notify(`Wall Height - Migrated ${migratedScenes} scenes to new Wall Height data structure.`);
          console.log(`Wall Height - Migrated ${migratedScenes} scenes to new Wall Height data structure.`);
      }else{
          ui.notifications.notify(`Wall Height - No scenes to migrate.`);
          console.log(`Wall Height - No scenes to migrate.`);
      }
      return migratedScenes;
  }

  async migrateScenes (){
      const scenes = Array.from(game.scenes);
      let migratedScenes = 0;
      ui.notifications.warn("Wall Height - Migrating all scenes, do not refresh the page!");
      for(const scene of scenes){
        const migrated = await migrateData(scene);
        if(migrated) migratedScenes++;
      }
      if(migratedScenes > 0){
        ui.notifications.notify(`Wall Height - Migrated ${migratedScenes} scenes to new Wall Height data structure.`);
        console.log(`Wall Height - Migrated ${migratedScenes} scenes to new Wall Height data structure.`);
      }else{
          ui.notifications.notify(`Wall Height - No scenes to migrate.`);
          console.log(`Wall Height - No scenes to migrate.`);
      }
      return migratedScenes;
  }

  async migrateAll(){
      ui.notifications.error(`Wall Height - WARNING: The new data structure requires Better Roofs, Levels and 3D Canvas and Token Attacher to be updated!`);
      await WallHeight.migrateScenes();
      await WallHeight.migrateCompendiums();
      ui.notifications.notify(`Wall Height - Migration Complete.`);
      await game.settings.set(MODULE_ID, 'migrateOnStartup', false);
  }

  getWallBounds(wall){
    return getWallBounds(wall);
  }
}

export function registerWrappers() {
  globalThis.WallHeight = new WallHeightUtils();

  function preUpdateElevation(wrapped, ...args) {
    WallHeight.updateElevations(this);
    wrapped(...args);
  }

  function testWallHeight(wall, origin, type) {
    const { top, bottom } = getWallBounds(wall);
    const { advancedVision } = getSceneSettings(wall.scene);
    const elevation = type === "light" || type === "sound" ? origin.z ?? WallHeight.currentTokenElevation : WallHeight.currentTokenElevation;
    if (
      elevation == null ||
      !advancedVision ||
      (elevation >= bottom &&
        elevation < top)
    ) {
      return true;
    } else {
      return null;
    }
  }

  function testWallInclusion(wrapped, ...args){
    return wrapped(...args) && testWallHeight(args[0], args[1], args[2]);
  }

  Hooks.on("updateToken", (token,updates)=>{
    const { advancedVision } = getSceneSettings(canvas.scene);
    if (!advancedVision) return;
    if("elevation" in updates){
      WallHeight.updateElevations(token.object);
    }
  })

  Hooks.on("controlToken", (token,control)=>{
    const { advancedVision } = getSceneSettings(canvas.scene);
    if (!advancedVision) return;
    if(control) {
      WallHeight.updateElevations(token);
    }
  })

  libWrapper.register(MODULE_ID, "CONFIG.Token.objectClass.prototype.updateSource", preUpdateElevation, "WRAPPER");

  // This function builds the ClockwiseSweepPolygon to determine the token's vision.
  // Update the elevation just beforehand so we're using the correct token's elevation and height
  libWrapper.register(MODULE_ID, "Token.prototype.updateVisionSource", preUpdateElevation, "WRAPPER");

  // This function builds the ClockwiseSweepPolygon to determine the token's light coverage.
  // Update the elevation just beforehand so we're using the correct token's elevation and height
  libWrapper.register(MODULE_ID, "Token.prototype.updateLightSource", preUpdateElevation, "WRAPPER");

  // This function detemines whether a wall should be included. Add a condition on the wall's height compared to the current token
  libWrapper.register(MODULE_ID, "ClockwiseSweepPolygon.testWallInclusion", testWallInclusion, "WRAPPER");

  libWrapper.register("wall-height", "ClockwiseSweepPolygon.prototype.initialize", function (wrapped, origin, config = {}, ...args) {
    const constrain = config.source?.object?.document?.getFlag(MODULE_ID, "advancedLighting")
    if(!constrain) return wrapped(origin, config, ...args);
    origin.z = origin.z ?? (config.source?.object instanceof Token ? config.source.object.data.elevation : config.source?.object?.document?.data?.flags?.levels?.rangeBottom);

    return wrapped(origin, config, ...args);
}, "WRAPPER");

}
