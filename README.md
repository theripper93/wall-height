# Wall Height

## Before opening an issue read [THIS](https://github.com/theripper93/Levels/blob/v9/ISSUES.md)
Give a vertical dimension to your walls.

![Latest Release Download Count](https://img.shields.io/github/downloads/theripper93/wall-height/latest/module.zip?color=2b82fc&label=DOWNLOADS&style=for-the-badge) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fwall-height&colorB=03ff1c&style=for-the-badge)](https://forge-vtt.com/bazaar#package=wall-height) ![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Ftheripper93%2Fwall-height%2Fmain%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange&style=for-the-badge) [![alt-text](https://img.shields.io/badge/-Patreon-%23ff424d?style=for-the-badge)](https://www.patreon.com/theripper93) [![alt-text](https://img.shields.io/badge/-Discord-%235662f6?style=for-the-badge)](https://discord.gg/F53gBjR97G)

Thank you to Cole Schultz (cole#9640) for the original implementation and Erithtotl (Erithtotl#5139) for maintaining the module. I (theripper93) have now taken over the Module.

This Module adds the ability to give a vertical height to walls, this means that tokens can look and move under\over them depending on their elevation. To further enhance the threedimensionality of your experience the use of ![Levels](https://github.com/theripper93/Levels) is suggested as well!

![Preview](scene-config.png)

The top and bottom heights of the walls are configurable in the wall configuration dialog.

![Preview](wall-height.gif)

Finally, 3.5 adds a Macro Compendium, with a Set Elevation macro, which allows for quick updating of the elevation of multiple tokens, handy when the party is moving to different levels on a multilevel map.

With 3.5.2, the Set Elevation macro has been modified to support Multilevel Tokens (https://foundryvtt.com/packages/multilevel-tokens/) (can accept one or two parameters for entry and exit elevations).

In addition, libWrapper support has been introduced to improve module compatability.

## Helper Functions

Due to the module beeing setup incorrectly and not wanting to break everyone's maps these helper functions can help you interact with Wall Height data since the regular getFlag\setFlag won't work

```js
WallHeight.getTop(wallPlaceableOrDocument)
WallHeight.getBottom(wallPlaceableOrDocument)
WallHeight.getWallBounds(wallPlaceableOrDocument)
```
will return the top and bottom of a wall placeable object or wall document (getWallBounds will return {top,bottom})

```js
WallHeight.setTop(wallDocument, top)
WallHeight.setBottom(wallDocument, bottom)
```
will set the top\bottom of a wall document - these are both async

```js
WallHeight.updateAll(update, filter)
```
will mirror the canvas.walls.updateAll, the update object is {wallHeightTop,wallHeightBottom} - this is async

## Project Status

As I'm now mantaining the module, Wall Height will keep preserving it's orginal porpouse of setting an elevation to walls, to keep this module as conflict free as possible no other functionalies for three dimensional navigation will be added since those will be kept for implementation in Levels while this module will serve as a light weight variant for veerticality for users that don't need the full suit of features.

## Compatibility

This module is likely incompatible with modules which modify token vision.

## License

Licensed under the GPLv3 License (see [LICENSE](LICENSE)).
