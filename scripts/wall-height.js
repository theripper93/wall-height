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
    const {advancedVision,advancedMovement} = getSceneSettings(canvas.scene);
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

    globalThis.WallHeight = {
      migrateData,
      migrateCompendiums: async () => {
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
      },
      migrateScenes: async () => {
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
      },
      migrateAll: async () => {
        ui.notifications.error(`Wall Height - WARNING: The new data structure requires Better Roofs, Levels and 3D Canvas and Token Attacher to be updated!`);
        await WallHeight.migrateScenes();
        await WallHeight.migrateCompendiums();
        ui.notifications.notify(`Wall Height - Migration Complete.`);
        await game.settings.set(MODULE_ID, 'migrateOnStartup', false);
      },
      getWallBounds,
    };
}

Hooks.on("renderWallConfig", (app, html, data) => {
    const {advancedVision} = getSceneSettings(canvas.scene);
    if(!advancedVision) return;
    const { top, bottom } = getWallBounds(app.object);
    const topLabel = game.i18n.localize(`${MODULE_SCOPE}.WallHeightTopLabel`);
    const bottomLabel = game.i18n.localize(`${MODULE_SCOPE}.WallHeightBottomLabel`);
    const moduleLabel = game.i18n.localize(`${MODULE_SCOPE}.ModuleLabel`);

    html.find(".form-group").last().after(`
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



