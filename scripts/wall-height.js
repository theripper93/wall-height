import { registerWrappers } from "./patches.js";
import { getWallBounds, getSceneSettings, migrateData, getTokenLOSheight } from "./utils.js";
import { MODULE_SCOPE, TOP_KEY, BOTTOM_KEY, ENABLE_ADVANCED_VISION_KEY, ENABLE_ADVANCED_MOVEMENT_KEY, showWelcome } from "./const.js";

const MODULE_ID = "wall-height";

Object.defineProperty(foundry.canvas.placeables.Token.prototype, "losHeight", {
    get: function myProperty() {
        return getTokenLOSheight(this);
    },
});

Hooks.once("init", () => {
    registerWrappers();
    registerSettings();
    WallHeight.cacheSettings();
});

Hooks.once("ready", () => {
    if (!game.user.isGM) return;
    if (game.settings.get(MODULE_ID, "migrateOnStartup")) WallHeight.migrateAll();
    if (game.settings.get(MODULE_ID, "migrateTokenHeight")) {
        WallHeight.migrateTokenHeight();
        game.settings.set(MODULE_ID, "migrateTokenHeight", false);
    }
});

function registerSettings() {
    game.settings.register(MODULE_ID, "enableWallText", {
        name: game.i18n.localize(`${MODULE_SCOPE}.settings.enableWallText.name`),
        hint: game.i18n.localize(`${MODULE_SCOPE}.settings.enableWallText.hint`),
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        onChange: () => {
            WallHeight.cacheSettings();
        },
    });

    game.settings.register(MODULE_ID, "autoLOSHeight", {
        name: game.i18n.localize(`${MODULE_SCOPE}.settings.autoLOSHeight.name`),
        hint: game.i18n.localize(`${MODULE_SCOPE}.settings.autoLOSHeight.hint`),
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        onChange: () => {
            WallHeight.cacheSettings();
        },
    });

    game.settings.register(MODULE_ID, "defaultLosHeight", {
        name: game.i18n.localize(`${MODULE_SCOPE}.settings.defaultLosHeight.name`),
        hint: game.i18n.localize(`${MODULE_SCOPE}.settings.defaultLosHeight.hint`),
        scope: "world",
        config: true,
        type: Number,
        default: 6,
        onChange: () => {
            WallHeight.cacheSettings();
        },
    });

    game.settings.register(MODULE_ID, "losHeightMulti", {
        name: game.i18n.localize(`${MODULE_SCOPE}.settings.losHeightMulti.name`),
        hint: game.i18n.localize(`${MODULE_SCOPE}.settings.losHeightMulti.hint`),
        scope: "world",
        config: true,
        type: Number,
        default: 0.89,
        range: {
            min: 0.1,
            max: 2,
            step: 0.01,
        },
        onChange: () => {
            WallHeight.cacheSettings();
        },
    });

    game.settings.register(MODULE_ID, "globalAdvancedLighting", {
        name: game.i18n.localize(`${MODULE_SCOPE}.settings.globalAdvancedLighting.name`),
        hint: game.i18n.localize(`${MODULE_SCOPE}.settings.globalAdvancedLighting.hint`),
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });

    game.settings.register(MODULE_ID, "migrateOnStartup", {
        name: game.i18n.localize(`${MODULE_SCOPE}.settings.migrateOnStartup.name`),
        hint: game.i18n.localize(`${MODULE_SCOPE}.settings.migrateOnStartup.hint`),
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register(MODULE_ID, "migrateTokenHeight", {
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
    });
}

Hooks.on("renderWallConfig", (app, html, data) => {
    const { advancedVision } = getSceneSettings(canvas.scene);
    if (!advancedVision) return;
    let { top, bottom } = getWallBounds(app.document);
    top = parseFloat(top);
    bottom = parseFloat(bottom);
    const topLabel = game.i18n.localize(`${MODULE_SCOPE}.WallHeightTopLabel`);
    const bottomLabel = game.i18n.localize(`${MODULE_SCOPE}.WallHeightBottomLabel`);
    const moduleLabel = game.i18n.localize(`${MODULE_SCOPE}.ModuleLabel`);
    html.querySelector(`[name="door"]`).closest("fieldset").insertAdjacentHTML(
        "afterend",
        `
    <fieldset>
        <legend>${moduleLabel}</legend>
            <div class="form-group">
                <label>${topLabel}</label>
                <input name="flags.${MODULE_SCOPE}.${TOP_KEY}" type="number" step="any" value="${Number.isFinite(top) ? top : ""}" placeholder="Infinity">
            </div>
            <div class="form-group">
                <label>${bottomLabel}</label>
                <input name="flags.${MODULE_SCOPE}.${BOTTOM_KEY}" type="number" step="any" value="${Number.isFinite(bottom) ? bottom : ""}" placeholder="-Infinity">
            </div>
        </legend>
    </fieldset>
    `,
    );
    app.setPosition({ height: "auto" });
});

Hooks.on("renderAmbientLightConfig", (app, html, data) => {
    if (html.querySelector(`input[name="flags.${MODULE_SCOPE}.advancedLighting"]`)) return;
    const { advancedVision } = getSceneSettings(canvas.scene);
    if (!advancedVision) return;
    const label = game.i18n.localize(`${MODULE_SCOPE}.advancedLightingLabel`);
    const notes = game.i18n.localize(`${MODULE_SCOPE}.advancedLightingNotes`);
    const rangeTop = game.i18n.localize(`${MODULE_SCOPE}.levelsRangeTop`);
    const distance = (app.document.parent?.grid.units ?? game.system.grid.units) || game.i18n.localize(`${MODULE_SCOPE}.distance`);
    const checked = app.document.getFlag(MODULE_SCOPE, "advancedLighting") ? "checked" : "";
    const globalAdvancedLighting = game.settings.get(MODULE_ID, "globalAdvancedLighting");
    const warnEnabledGlobally = `<p class="hint" style="color: red;">${game.i18n.localize(`${MODULE_SCOPE}.ALGlobal`)}</p>`;
    const hint = globalAdvancedLighting ? warnEnabledGlobally : "";
    const _injectHTML = `<div class="form-group">
    <label>${label}</label>
    <input type="checkbox" name="flags.${MODULE_SCOPE}.advancedLighting" ${checked} ${globalAdvancedLighting ? "disabled" : ""}>
    ${hint}
    <p class="hint">${notes}</p>
    </div>`;
    html.querySelector(`input[name="walls"]`).closest(".form-group").insertAdjacentHTML("afterend", _injectHTML);
    app.setPosition({ height: "auto" });

    if (WallHeight.isLevels) return;
    const top = app.document.flags?.levels?.rangeTop;
    const elevationHtml = `
    <div class="form-group slim">
        <label>${rangeTop} <span class="units">(${distance})</span></label>
        <div class="form-fields">
            <input name="flags.levels.rangeTop" type="number" step="any" value="${Number.isFinite(top) ? top : ""}" placeholder="Infinity">
        </div>
    </div>
    `;
    html.querySelector(`input[name="x"]`).closest(".form-group").insertAdjacentHTML("afterend", elevationHtml);
    app.setPosition({ height: "auto" });
});

Hooks.on("renderAmbientSoundConfig", (app, html, data) => {
    if (html.querySelector(`input[name="flags.${MODULE_SCOPE}.advancedLighting"]`)) return;
    const { advancedVision } = getSceneSettings(canvas.scene);
    if (!advancedVision) return;
    const label = game.i18n.localize(`${MODULE_SCOPE}.advancedLightingLabel`);
    const notes = game.i18n.localize(`${MODULE_SCOPE}.advancedLightingNotes`);
    const checked = app.document.getFlag(MODULE_SCOPE, "advancedLighting") ? "checked" : "";
    const rangeTop = game.i18n.localize(`${MODULE_SCOPE}.levelsRangeTop`);
    const distance = (canvas.scene.grid.units ?? game.system?.grid?.units) || game.i18n.localize(`${MODULE_SCOPE}.distance`);
    const globalAdvancedLighting = game.settings.get(MODULE_ID, "globalAdvancedLighting");
    const warnEnabledGlobally = `<p class="hint" style="color: red;">${game.i18n.localize(`${MODULE_SCOPE}.ALGlobal`)}</p>`;
    const hint = globalAdvancedLighting ? warnEnabledGlobally : "";
    const _injectHTML = `<div class="form-group">
    <label>${label}</label>
    <input type="checkbox" name="flags.${MODULE_SCOPE}.advancedLighting" ${checked} ${globalAdvancedLighting ? "disabled" : ""}>
    ${hint}
    <p class="hint">${notes}</p>
    </div>`;
    html.querySelector(`input[name="walls"]`).closest(".form-group").insertAdjacentHTML("afterend", _injectHTML);
    app.setPosition({ height: "auto" });
    if (WallHeight.isLevels) return;
    const top = app.document.flags?.levels?.rangeTop;
    const elevationHtml = `
    <div class="form-group slim">
        <label>${rangeTop} <span class="units">(${distance})</span></label>
        <div class="form-fields">
            <input name="flags.levels.rangeTop" type="number" step="any" value="${Number.isFinite(top) ? top : ""}" placeholder="Infinity">
        </div>
    </div>
    `;
    html.querySelector(`input[name="radius"]`).closest(".form-group").insertAdjacentHTML("afterend", elevationHtml);
    app.setPosition({ height: "auto" });
});

const renderTokenConfig = (app, html, data) => {
    if(html.querySelector(`input[name="flags.${MODULE_SCOPE}.tokenHeight"]`)) return;
    const tokenHeight = app.token.getFlag(MODULE_SCOPE, "tokenHeight") || 0;
    const label = game.i18n.localize(`${MODULE_SCOPE}.tokenHeightLabel`);
    const losHeight = app.document?.object?.losHeight ?? 0;
    const height = losHeight - app.token.elevation;
    const hint = game.i18n.localize(`${MODULE_SCOPE}.tokenHeightHint`).replace("{{height}}", height).replace("{{losHeight}}", losHeight);
    const distance = (canvas.scene?.grid?.units ?? game.system?.grid?.units) || game.i18n.localize(`${MODULE_SCOPE}.distance`);
    let newHtml = `
  <div class="form-group slim">
              <label>${label} <span class="units">(${distance})</span></label>
              <div class="form-fields">
              <input type="number" step="any" name="flags.${MODULE_SCOPE}.tokenHeight" placeholder="units" value="${tokenHeight}">
              </div>
              ${app.document?.object?.losHeight ? `<p class="hint">${hint}</p>` : ""}         
            </div>
  `;
    html.querySelector('[name="lockRotation"]').closest(".form-group").insertAdjacentHTML("afterend", newHtml);
    app.setPosition({ height: "auto" });
};

Hooks.on("renderTokenConfig",  renderTokenConfig);
Hooks.on("renderPrototypeTokenConfig",  renderTokenConfig);

Hooks.on("renderSceneConfig", (app, html, data) => {
    const { advancedVision } = getSceneSettings(app.document);
    const enableVisionKeyLabel = game.i18n.localize(`${MODULE_SCOPE}.AdvancedVisionLabel`);
    const moduleLabel = game.i18n.localize(`${MODULE_SCOPE}.ModuleLabel`);
    html.querySelector(`[name="environment.globalLight.enabled"]`)
        .closest("fieldset")
        .insertAdjacentHTML(
            "afterend",
            `
    <fieldset>
    <legend>${moduleLabel}</legend>
        <div class="form-group">
            <li class="flexrow">
                <label>${enableVisionKeyLabel}</label>
                <input name="flags.${MODULE_SCOPE}.${ENABLE_ADVANCED_VISION_KEY}" type="checkbox" data-dtype="Boolean" ` +
                (advancedVision || advancedVision == null ? `checked` : ``) +
                `>
            </li>
        </div>
    </fieldset>`,
        );
    app.setPosition({ height: "auto" });
});

Handlebars.registerHelper("if_null", function (a, opts) {
    if (a == null) {
        return opts.fn(this);
    } else {
        return opts.inverse(this);
    }
});

// First time message

Hooks.once("ready", () => {
    showWelcome();
});
