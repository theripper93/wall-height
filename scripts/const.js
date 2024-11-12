export const MODULE_SCOPE = "wall-height";
export const TOP_KEY = "top";
export const BOTTOM_KEY = "bottom";
export const ENABLE_ADVANCED_VISION_KEY = "advancedVision";
export const ENABLE_ADVANCED_MOVEMENT_KEY = "wallHeightAdvancedMovement";


export function showWelcome() {
    if (!game.user.isGM) return;
    const FALLBACK_MESSAGE = `<h1><i class="fa-solid fa-block-brick"></i> Wall Height</h1> <p><strong>New to Wall Height? Visit the <a href="https://wiki.theripper93.com/free/wall-height">Wiki</a> for a quickstart guide and resources.</strong></p> <p>Special thanks to all my <a href="https://www.patreon.com/theripper93">Patreons</a> for making ongoing updates and development possible. Supporting gives you access to <strong>30+ premium modules</strong> and priority support.</p> <strong style="font-size: large;">Want to level up your games? </strong><p>Check out the premium module collection!</p> <iframe width="100%" height="auto" src="https://www.youtube.com/embed/2Iq_so_GsLA" title="3D Canvas Overview" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe> <p><strong>Explore all resources and modules:</strong></p> <ul> <li><a href="https://theripper93.com/">Check out all my free and premium modules</a></li> <li><a href="https://wiki.theripper93.com/free/wall-height">Wall Height Wiki</a></li> <li><a href="https://www.patreon.com/theripper93">Support on Patreon</a></li><li><a href="https://discord.theripper93.com/">Discord Channel</a></li> </ul> `;

    // Settings key used for the "Don't remind me again" setting
    const DONT_REMIND_AGAIN_KEY = "chat-welcome-message-shown";

    // Dialog code
    game.settings.register(MODULE_SCOPE, DONT_REMIND_AGAIN_KEY, {
        default: false,
        type: Boolean,
        scope: "world",
        config: false,
    });
    if (game.user.isGM && !game.settings.get(MODULE_SCOPE, DONT_REMIND_AGAIN_KEY)) {

        ChatMessage.create({
            user: game.user.id,
            whisper: game.users.filter(u => u.isGM).map(u => u.id),
            blind: true,
            content: FALLBACK_MESSAGE,
        });
    }
}