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
    if(!game.user.isGM) return;
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
        <label>${elevation} <span class="units">${distance}</span></label>
        <div class="form-fields">
            <input name="flags.levels.rangeBottom" type="text" data-dtype="Number" value="${bottom}">
        </div>
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
        <label>${elevation} <span class="units">${distance}</span></label>
        <div class="form-fields">
            <input name="flags.levels.rangeBottom" type="text" data-dtype="Number" value="${bottom}">
        </div>
    </div>
    `
    html.find(`input[name="radius"]`).closest(".form-group").after(elevationHtml);
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
                <input name="flags.${MODULE_SCOPE}.${ENABLE_ADVANCED_VISION_KEY}" type="checkbox" data-dtype="Boolean" `+ ((advancedVision || advancedVision==null)?`checked`:``)+`>
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

// First time message

Hooks.once("ready", () => {
    // Module title
    const MODULE_TITLE = game.modules.get(MODULE_ID).data.title;
  
    const FALLBACK_MESSAGE_TITLE = "IMPORTANT - Wall Height 4";
    const FALLBACK_MESSAGE = `<large>
    <p><strong>I (theripper93) am now taking over the developement of Wall Height, be sure to stop by my <a href="https://theripper93.com/">Discord</a> for help and support from the wonderful community as well as many resources</strong></p>
  
    <h1>Wall Height Migration</h1>
    <p>Due to some incorrect data structures the Wall Height data needs to be migrated, this process will happen automatically for all your scenes and compendiums, if you need to run the migration again you can do so in the module settings. <strong>This new version of Wall Height requires Levels, Better Roofs, Token Attacher and 3D Canvas to be updated as well!</strong></p>

    <p>Thanks to all the patreons supporting the development of my modules making continued updates possible!</p>
    <p>If you want to support the development of the module or get customized support in setting up your maps you can do so here : <a href="https://www.patreon.com/theripper93">Patreon</a> </p></large>
    <p><strong>Patreons</strong> get also access to <strong>15+ premium modules</strong></p>
    <p>Want even more verticality? Go Full 3D</p>
    <h1>3D Canvas</h1>
    <iframe width="385" height="225" src="https://www.youtube.com/embed/hC1QGZFUhcU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    <p>Check 3D Canvas and all my other <strong>15+ premium modules <a href="https://theripper93.com/">Here</a></strong></p>`;
  
    // Settings key used for the "Don't remind me again" setting
    const DONT_REMIND_AGAIN_KEY = "popup-dont-remind-again";
  
    // Dialog code
    game.settings.register(MODULE_ID, DONT_REMIND_AGAIN_KEY, {
      name: "",
      default: false,
      type: Boolean,
      scope: "world",
      config: false,
    });
    if (game.user.isGM && !game.settings.get(MODULE_ID, DONT_REMIND_AGAIN_KEY)) {
      new Dialog({
        title: FALLBACK_MESSAGE_TITLE,
        content: FALLBACK_MESSAGE,
        buttons: {
          ok: { icon: '<i class="fas fa-check"></i>', label: "Understood" },
          dont_remind: {
            icon: '<i class="fas fa-times"></i>',
            label: "Don't remind me again",
            callback: () =>
              game.settings.set(MODULE_ID, DONT_REMIND_AGAIN_KEY, true),
          },
        },
      }).render(true);
    }
  });

