import { getWallBounds,getSceneSettings,migrateData } from "./utils.js";

const MODULE_ID = "wall-height";

class WallHeightUtils{
  constructor(){
    this._currentTokenElevation = null;
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
      sound: { initialize: true, refresh: true },
      foreground: { refresh: true }
    });
  }

  updateElevations(token) {
    if(!token._controlled && !token.object?._controlled) return;
    this.currentTokenElevation =
      typeof _levels !== "undefined" && _levels?.advancedLOS
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

  function testWallHeight(wall) {
    const { top, bottom } = getWallBounds(wall);
    const { advancedVision } = getSceneSettings(wall.scene);

    if (
      WallHeight.currentTokenElevation == null ||
      !advancedVision ||
      (WallHeight.currentTokenElevation >= bottom &&
        WallHeight.currentTokenElevation < top)
    ) {
      return true;
    } else {
      return null;
    }
  }

  function testWallInclusion(wrapped, ...args){
    return wrapped(...args) && testWallHeight(args[0]);
  }

  Hooks.on("updateToken", (token,updates)=>{
    const { advancedVision } = getSceneSettings(canvas.scene);
    if (!advancedVision) return;
    if("elevation" in updates){
      //token.object ? token.object.updateSource(true) : token.updateSource(true);
      WallHeight.updateElevations(token.object);
    }
  })

  Hooks.on("controlToken", (token,control)=>{
    const { advancedVision } = getSceneSettings(canvas.scene);
    if (!advancedVision) return;
    if(control) {
      //token.object ? token.object.updateSource(true) : token.updateSource(true);
      WallHeight.updateElevations(token);
    }
  })

  function tokenOnUpdate(func, data, options) {
    func.apply(this, [data, options]);
    const { advancedVision } = getSceneSettings(canvas.scene);
    if (!advancedVision) return;
    const changed = new Set(Object.keys(data));
  
    // existing conditions that have already been checked to perform a sight layer update
    const visibilityChange = changed.has("hidden");
    const positionChange = ["x", "y"].some((c) => changed.has(c));
    const perspectiveChange =
      changed.has("rotation") && this.hasLimitedVisionAngle;
    const visionChange = [
      "brightLight",
      "brightSight",
      "dimLight",
      "dimSight",
      "lightAlpha",
      "lightAngle",
      "lightColor",
      "sightAngle",
      "vision",
    ].some((k) => changed.has(k));
  
    const alreadyUpdated =
      (visibilityChange || positionChange || perspectiveChange || visionChange) &&
      (this.data.vision || changed.has("vision") || this.emitsLight);
  
    // if the original _onUpdate didn't perform a sight layer update,
    // but elevation has changed, do the update now
    if (changed.has("elevation") && !alreadyUpdated) {
      this.updateSource(true);
      canvas.addPendingOperation("SightLayer.refresh",canvas.sight.refresh,canvas.sight);
      canvas.addPendingOperation("LightingLayer.refresh",canvas.lighting.refresh,canvas.lighting);
      canvas.addPendingOperation("SoundLayer.refresh",canvas.sounds.refresh,canvas.sounds);
    }
  }

  libWrapper.register(MODULE_ID, "CONFIG.Token.objectClass.prototype.updateSource", preUpdateElevation, "WRAPPER");

  // This function builds the ClockwiseSweepPolygon to determine the token's vision.
  // Update the elevation just beforehand so we're using the correct token's elevation and height
  libWrapper.register(MODULE_ID, "Token.prototype.updateVisionSource", preUpdateElevation, "WRAPPER");

  // This function builds the ClockwiseSweepPolygon to determine the token's light coverage.
  // Update the elevation just beforehand so we're using the correct token's elevation and height
  libWrapper.register(MODULE_ID, "Token.prototype.updateLightSource", preUpdateElevation, "WRAPPER");

  // This function detemines whether a wall should be included. Add a condition on the wall's height compared to the current token
  libWrapper.register(MODULE_ID, "ClockwiseSweepPolygon.testWallInclusion", testWallInclusion, "WRAPPER");

  //libWrapper.register(MODULE_ID, 'CONFIG.Token.objectClass.prototype._onUpdate',tokenOnUpdate,'WRAPPER');
}
