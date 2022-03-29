import { getWallBounds, getSceneSettings } from "./utils.js";

const MODULE_ID = "wall-height";

export function registerWrappers() {
  game.currentTokenElevation = null;

  function updateElevations(token) {
    game.currentTokenElevation =
      typeof _levels !== "undefined" && _levels?.advancedLOS
        ? _levels.getTokenLOSheight(token)
        : token.data.elevation;
  }

  function preUpdateElevation(wrapped, ...args) {
      updateElevations(this);
      wrapped(...args);
  }

  function testWallHeight(wall) {
    const { wallHeightTop, wallHeightBottom } = getWallBounds(wall);
    const { advancedVision, advancedMovement } = getSceneSettings(wall.scene);

    if (
      game.currentTokenElevation == null ||
      !advancedVision ||
      (game.currentTokenElevation >= wallHeightBottom &&
        game.currentTokenElevation < wallHeightTop)
    ) {
      return true;
    } else {
      return null;
    }
  }

  function testWallInclusion(wrapped, ...args){
    return wrapped(...args) && testWallHeight(args[0]);
  }

  function tokenOnUpdate(func, data, options) {
    func.apply(this, [data, options]);
    const { advancedVision, advancedMovement } = getSceneSettings(canvas.scene);
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

  libWrapper.register(MODULE_ID, 'CONFIG.Token.objectClass.prototype._onUpdate',tokenOnUpdate,'WRAPPER');
}
