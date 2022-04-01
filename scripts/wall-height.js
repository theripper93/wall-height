import { registerWrappers } from "./patches.js";
import { getWallBounds,getSceneSettings,migrateData } from "./utils.js";
import { WallHeightToolTip } from './tooltip.js';
import { MODULE_SCOPE, TOP_KEY, BOTTOM_KEY, ENABLE_ADVANCED_VISION_KEY, ENABLE_ADVANCED_MOVEMENT_KEY } from "./const.js";

const MODULE_ID = 'wall-height';


Hooks.once("init",()=>{
    registerWrappers();
    Hooks.on('renderHeadsUpDisplay', async (app, html, data) => {
        if(game.settings.get(MODULE_ID,'enableTooltip')){
            html.append('<template id="wall-height-tooltip"></template>');
            canvas.hud.wallHeight = new WallHeightToolTip();
        }
    });
    registerSettings();
});

Hooks.once("ready", ()=>{
    if(game.settings.get(MODULE_ID, 'migrateOnStartup')) WallHeight.migrateAll();
})

Hooks.on("hoverWall",(wall, hovered)=>{
    const {advancedVision} = getSceneSettings(canvas.scene);
    if(advancedVision!=null && !advancedVision)
        return;
    if (hovered) {
        canvas.hud.wallHeight.bind(wall);
    } else {
        canvas.hud.wallHeight.clear();
    }
});

Hooks.on("renderSceneControls", () => {
    if (canvas.hud?.wallHeight) canvas.hud.wallHeight.clear();
  });

Hooks.on("deleteWall", () => {
    if (canvas.hud?.wallHeight) canvas.hud.wallHeight.clear();
});

Hooks.on("createWall", () => {
    if (canvas.hud?.wallHeight) canvas.hud.wallHeight.clear();
});

function registerSettings() {
    game.settings.register(MODULE_ID, 'enableTooltip', {
        name: game.i18n.localize(`${MODULE_SCOPE}.settings.enableTooltip.name`),
        hint: game.i18n.localize(`${MODULE_SCOPE}.settings.enableTooltip.hint`),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(MODULE_ID, 'migrateOnStartup', {
        name: game.i18n.localize(`${MODULE_SCOPE}.settings.migrateOnStartup.name`),
        hint: game.i18n.localize(`${MODULE_SCOPE}.settings.migrateOnStartup.hint`),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true
    });
}

Hooks.on("renderWallConfig", (app, html, data) => {
    const {advancedVision} = getSceneSettings(canvas.scene);
    if(!advancedVision) return;
    const { top, bottom } = getWallBounds(app.object);
    const topLabel = game.i18n.localize(`${MODULE_SCOPE}.WallHeightTopLabel`);
    const bottomLabel = game.i18n.localize(`${MODULE_SCOPE}.WallHeightBottomLabel`);
    const moduleLabel = game.i18n.localize(`${MODULE_SCOPE}.ModuleLabel`);

    html.find(`select[name="ds"]`).closest(".form-group").after(`
    <fieldset>
        <legend>${moduleLabel}</legend>
            <div class="form-group">
                <label>${topLabel}</label>
                <input name="flags.${MODULE_SCOPE}.${TOP_KEY}" type="text" data-dtype="Number" value="${top}">
            </div>
            <div class="form-group">
                <label>${bottomLabel}</label>
                <input name="flags.${MODULE_SCOPE}.${BOTTOM_KEY}" type="text" data-dtype="Number" value="${bottom}">
            </div>
        </legend>
    </fieldset>
    `);
    app.setPosition({ height: "auto" });
});

Hooks.on("renderAmbientLightConfig", (app, html, data) => {
    const {advancedVision} = getSceneSettings(canvas.scene);
    if(!advancedVision) return;
    const label = game.i18n.localize(`${MODULE_SCOPE}.advancedLightingLabel`);
    const notes = game.i18n.localize(`${MODULE_SCOPE}.advancedLightingNotes`);
    const elevation = game.i18n.localize(`${MODULE_SCOPE}.elevation`);
    const distance = game.i18n.localize(`${MODULE_SCOPE}.distance`);
    const checked = app.object.getFlag(MODULE_SCOPE, "advancedLighting") ? "checked" : "";

    const _injectHTML = `<div class="form-group">
    <label>${label}</label>
    <input type="checkbox" name="flags.${MODULE_SCOPE}.advancedLighting" ${checked}>
    <p class="hint">${notes}</p>
    </div>`
    html.find(`input[name="walls"]`).closest(".form-group").after(_injectHTML);
    app.setPosition({ height: "auto" });

    if(WallHeight.isLevels) return
    const bottom = app.object.data.flags?.levels?.rangeBottom ?? -Infinity;
    const elevationHtml = `
    <div class="form-group">
        <label>${elevation}</label><span class="units">${distance}</span>
        <input name="flags.levels.rangeBottom" type="text" data-dtype="Number" value="${bottom}">
    </div>
    `
    html.find(`input[name="config.dim"]`).closest(".form-group").after(elevationHtml);
    app.setPosition({ height: "auto" });

})

Hooks.on("renderAmbientSoundConfig", (app, html, data) => {
    const {advancedVision} = getSceneSettings(canvas.scene);
    if(!advancedVision) return;
    const label = game.i18n.localize(`${MODULE_SCOPE}.advancedLightingLabel`);
    const notes = game.i18n.localize(`${MODULE_SCOPE}.advancedLightingNotes`);
    const checked = app.object.getFlag(MODULE_SCOPE, "advancedLighting") ? "checked" : "";
    const elevation = game.i18n.localize(`${MODULE_SCOPE}.elevation`);
    const distance = game.i18n.localize(`${MODULE_SCOPE}.distance`);
    
    const _injectHTML = `<div class="form-group">
    <label>${label}</label>
    <input type="checkbox" name="flags.${MODULE_SCOPE}.advancedLighting" ${checked}>
    <p class="hint">${notes}</p>
    </div>`
    html.find(`input[name="walls"]`).closest(".form-group").after(_injectHTML);
    app.setPosition({ height: "auto" });
    if(WallHeight.isLevels) return
    const bottom = app.object.data.flags?.levels?.rangeBottom ?? -Infinity;
    const elevationHtml = `
    <div class="form-group">
        <label>${elevation}</label><span class="units">${distance}</span>
        <input name="flags.levels.rangeBottom" type="text" data-dtype="Number" value="${bottom}">
    </div>
    `
    html.find(`input[name="darkness.max"]`).closest(".form-group").after(elevationHtml);
    app.setPosition({ height: "auto" });
})

Hooks.on("renderSceneConfig", (app, html, data) => {
    const {advancedVision} = getSceneSettings(app.object);
    const enableVisionKeyLabel = game.i18n.localize(`${MODULE_SCOPE}.AdvancedVisionLabel`);
    const moduleLabel = game.i18n.localize(`${MODULE_SCOPE}.ModuleLabel`);
    html.find(`input[name="globalLightThreshold"]`).closest(".form-group").after(`
    <fieldset>
    <legend>${moduleLabel}</legend>
        <div class="form-group">
            <li class="flexrow">
                <label>${enableVisionKeyLabel}</label>
                <input name="flags.${MODULE_SCOPE}.${ENABLE_ADVANCED_VISION_KEY}" type="checkbox" data-dtype="boolean" value="true" `+ ((advancedVision || advancedVision==null)?`checked`:``)+`>
            </li>
        </div>
    </fieldset>`
    );
    app.setPosition({ height: "auto" });
});

Handlebars.registerHelper('if_null', function(a, opts) {
    if (a == null) {
        return opts.fn(this);
    } else {
        return opts.inverse(this);
    }
});



