import { getWallBounds,getSceneSettings,migrateData,getLevelsBounds,getAdvancedLighting,migrateTokenHeight } from "./utils.js";

const MODULE_ID = "wall-height";

class WallHeightUtils{
  constructor(){
    this._advancedVision = null;
    this._currentTokenElevation = null;
    this.isLevels = game.modules.get("levels")?.active ?? false;
    this._isLevelsAutoCover = game.modules.get("levelsautocover")?.active ?? false;
    this._autoLosHeight = false;
    this._defaultTokenHeight = 6;
  }

  cacheSettings(){
    this._autoLosHeight = game.settings.get(MODULE_ID, 'autoLOSHeight');
    this._defaultTokenHeight = game.settings.get(MODULE_ID, 'defaultLosHeight');
    this._blockSightMovement = game.settings.get(MODULE_ID, "blockSightMovement");
    this._enableWallText = game.settings.get(MODULE_ID, "enableWallText");
    this.schedulePerceptionUpdate();
  }

  get tokenElevation(){
    return this._token?.document?.elevation ?? this.currentTokenElevation
  }

  set currentTokenElevation(elevation) {
    let update = false;
    const { advancedVision } = getSceneSettings(canvas.scene);
    if (this._currentTokenElevation !== elevation) {
      this._currentTokenElevation = elevation;
      if (advancedVision) {
        update = true;
      }
    }
    if (this._advancedVision !== !!advancedVision) {
      this._advancedVision = !!advancedVision;
      update = true;
    }
    if (update) {
      this.schedulePerceptionUpdate();
    }
  }

  get currentTokenElevation(){
    return this._currentTokenElevation;
  }

  schedulePerceptionUpdate(){
    if (!canvas.ready) return;
    canvas.perception.schedule({
      lighting: { initialize: true, refresh: true },
      sight: { initialize: true, refresh: true, forceUpdateFog: true },
      sounds: { initialize: true, refresh: true },
      foreground: { refresh: true }
    });
  }

  updateCurrentTokenElevation() {
    const token = canvas.tokens.controlled[0];
    if (!token && game.user.isGM) {
      this.currentTokenElevation = null;
      this._token = null;
    } else if (token) {
      this.currentTokenElevation = token.losHeight
      this._token = token;
    }
  }

  async setSourceElevationTop(document, value) {
    if (document instanceof TokenDocument) return;
    return await document.update({ "flags.levels.rangeTop": value });
  }

  getSourceElevationTop(document) {
    if (document instanceof TokenDocument) return document.object.losHeight
    return document.document.flags?.levels?.rangeTop ?? +Infinity;
  }

  async setSourceElevationBottom(document, value) {
    if (document instanceof TokenDocument) return await document.update({ "elevation": bottom });
    return await document.update({ "flags.levels.rangeBottom": value });
  }

  getSourceElevationBottom(document) {
    if (document instanceof TokenDocument) return document.document.elevation;
    return document.document.flags?.levels?.rangeBottom ?? -Infinity;
  }

  async setSourceElevationBounds(document, bottom, top) {
    if (document instanceof TokenDocument) return await document.update({ "elevation": bottom });
    return await document.update({ "flags.levels.rangeBottom": bottom, "flags.levels.rangeTop": top });
  }

  getSourceElevationBounds(document) {
    if (document instanceof TokenDocument) {
      const bottom = document.document.elevation;
      const top = document.object
        ? document.object.losHeight
        : bottom;
      return { bottom, top };
    }
    return getLevelsBounds(document);
  }

  async setSourceElevationBounds(document, bottom, top) {
    if (document instanceof TokenDocument) return await document.update({ "elevation": bottom });
    return await document.update({ "flags.levels.rangeBottom": bottom, "flags.levels.rangeTop": top });
  }

  getSourceElevationBounds(document) {
    if (document instanceof TokenDocument) {
      const bottom = document.elevation;
      const top = document.object
      ? document.object.losHeight
      : bottom;
      return { bottom, top };
    }
    return getLevelsBounds(document);
  }

  async removeOneToWalls(scene){
    if(!scene) scene = canvas.scene;
    const walls = Array.from(scene.walls);
    const updates = [];
    for(let wall of walls){
      const oldTop = wall.document.flags?.["wall-height"]?.top;
      if(oldTop != null && oldTop != undefined){
        const newTop = oldTop - 1;
        updates.push({_id: wall.id, "flags.wall-height.top": newTop});
      }
    }
    if(updates.length <= 0) return false;
    await scene.updateEmbeddedDocuments("Wall", updates);
    ui.notifications.notify("Wall Height - Added +1 to " + updates.length + " walls in scene " + scene.name);
    return true;
  }

  async migrateTokenHeight(){
    return await migrateTokenHeight();
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

  async setWallBounds(bottom, top, walls){
    if(!walls) walls = canvas.walls.controlled.length ? canvas.walls.controlled : canvas.walls.placeables;
    walls instanceof Array || (walls = [walls]);
    const updates = [];
    for(let wall of walls){
      updates.push({_id: wall.id, "flags.wall-height.top": top, "flags.wall-height.bottom": bottom});
    }
    return await canvas.scene.updateEmbeddedDocuments("Wall", updates);
  }

  getWallBounds(wall){
    return getWallBounds(wall);
  }

  addBoundsToRays(rays, token) {
    if (token) {
      const bottom = token.document.elevation;
      const top = WallHeight._blockSightMovement ? token.losHeight : token.document.elevation;
      for (const ray of rays) {
        ray.A.b = bottom;
        ray.A.t = top;
      }
    }
    return rays;
  }

}

export function registerWrappers() {
  globalThis.WallHeight = new WallHeightUtils();

  function tokenOnUpdate(wrapped, ...args) {
    wrapped(...args);

    updateTokenSourceBounds(this);
  }

  function updateTokenSourceBounds(token) {
    const { advancedVision } = getSceneSettings(token.scene);
    const losHeight = token.losHeight;
    const sourceId = token.sourceId;
    if (!advancedVision) {
      if (canvas.effects.visionSources.has(sourceId)) {
        token.vision.los.origin.b = token.vision.los.origin.t = losHeight;
      }
      if (canvas.lighting.sources.has(sourceId)) {
        token.light.los.origin.b = token.light.los.origin.t = losHeight;
      }
    } else if (canvas.effects.visionSources.has(sourceId) && (token.vision.los.origin.b !== losHeight || token.vision.los.origin.t !== losHeight)
      || canvas.lighting.sources.has(sourceId) && (token.light.los.origin.b !== losHeight || token.light.los.origin.t !== losHeight)) {
      token.updateSource({ defer: true });
      canvas.perception.schedule({
        lighting: { refresh: true },
        sight: { refresh: true, forceUpdateFog: true },
        sounds: { refresh: true },
        foreground: { refresh: true }
      });
    }
  }

  function testWallInclusion(wrapped, ...args) {
    if (!wrapped(...args)) return false;
    const wall = args[0]
    const { advancedVision } = getSceneSettings(wall.scene);
    if (!advancedVision) return true;
    const { top, bottom } = getWallBounds(wall);
    const b = this.config?.source?.object?.b ?? this.origin?.object?.b ?? -Infinity;
    const t = this.config?.source?.object?.t ?? this.origin?.object?.t ?? +Infinity;
    return b >= bottom && t <= top;
  } 

  function isDoorVisible(wrapped, ...args) {
    const wall = this.wall;
    const { advancedVision } = getSceneSettings(wall.scene);
    const elevation = WallHeight.isLevels && _levels?.UI?.rangeEnabled && !canvas.tokens.controlled[0] ? WallHeight.currentTokenElevation : WallHeight._token?.document?.elevation;
    if (elevation == null || !advancedVision) return wrapped(...args);
    const { top, bottom } = getWallBounds(wall);
    if (elevation < bottom || elevation > top) return false;
    return wrapped(...args);
  }

  function setSourceElevation(wrapped, origin, config = {}, ...args) {

    let bottom = -Infinity;
    let top = +Infinity;
    const object = config.source?.object ?? origin.object;
    if (origin.b == undefined && origin.t == undefined) {
      if (object instanceof Token) {
        if (config.type !== "move") {
          bottom = top = object.losHeight;
        } else {
          bottom = object.document.elevation;
          top = WallHeight._blockSightMovement ? object.losHeight : bottom;
        }
      } else if (object instanceof AmbientLight || object instanceof AmbientSound) {
        if (getAdvancedLighting(object.document)) {
          const bounds = getLevelsBounds(object.document)//WallHeight.getElevation(object.document);
          bottom = bounds.bottom;
          top = bounds.top;
        } else {
          bottom = WallHeight.currentTokenElevation;
          if (bottom == null) {
            bottom = -Infinity;
            top = +Infinity;
          } else {
            top = bottom;
          }
        }
      }
    }
    if(object){
      object.b = origin.b ?? bottom;
      object.t = origin.t ?? top;
    }
    return wrapped(origin, config, ...args);
  }

  function drawWallRange(wrapped, ...args){
    const { advancedVision } = getSceneSettings(canvas.scene);
    const bounds = getWallBounds(this);
    if(!WallHeight._enableWallText || !advancedVision || (bounds.top == Infinity && bounds.bottom == -Infinity)) return wrapped(...args);
    wrapped(...args);
    const style = CONFIG.canvasTextStyle.clone();
    style.fontSize /= 1.5;
    style.fill = this._getWallColor();
    if(bounds.top == Infinity) bounds.top = "Inf";
    if(bounds.bottom == -Infinity) bounds.bottom = "-Inf";
    const range = `${bounds.top} / ${bounds.bottom}`;
    const oldText = this.children.find(c => c.name === "wall-height-text");
    const text = oldText ?? new PreciseText(range, style);
    text.text = range;
    text.name = "wall-height-text";
    let angle = (Math.atan2( this.coords[3] - this.coords[1], this.coords[2] - this.coords[0] ) * ( 180 / Math.PI ));
    angle = (angle+90)%180 - 90;
    console.log(angle)
    text.position.set(this.center.x, this.center.y);
    text.anchor.set(0.5, 0.5);
    text.angle = angle;
    if(!oldText) this.addChild(text);
  }

  Hooks.on("updateToken", () => {
    WallHeight.updateCurrentTokenElevation();
  });

  Hooks.on("controlToken", () => {
    WallHeight.updateCurrentTokenElevation();
  });

  Hooks.on("updateScene", (doc, change) => {
    WallHeight.updateCurrentTokenElevation();
  });

  Hooks.on("canvasInit", () => {
    WallHeight._advancedVision = null;
    WallHeight._currentTokenElevation = null;
    WallHeight._token = null;
  });

  Hooks.on("canvasReady", () => {
    WallHeight.updateCurrentTokenElevation();
  });

  libWrapper.register(MODULE_ID, "DoorControl.prototype.isVisible", isDoorVisible, "MIXED");

  libWrapper.register(MODULE_ID, "CONFIG.Token.objectClass.prototype._onUpdate", tokenOnUpdate, "WRAPPER");

  libWrapper.register(MODULE_ID, "ClockwiseSweepPolygon.prototype._testWallInclusion", testWallInclusion, "WRAPPER", { perf_mode: "FAST" });

  libWrapper.register(MODULE_ID, "ClockwiseSweepPolygon.prototype.initialize", setSourceElevation, "WRAPPER");

  libWrapper.register(MODULE_ID, "Wall.prototype.refresh", drawWallRange, "WRAPPER");
}
