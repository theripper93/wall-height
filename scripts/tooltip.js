export class WallHeightToolTip extends BasePlaceableHUD {

	static get defaultOptions() {
		const options = super.defaultOptions;
		options.classes = options.classes.concat(["wall-height-tooltip"]);
		options.template = "modules/wall-height/templates/tooltip.html";
		options.id = "wall-height-tooltip";
		return options;
	}

    getData() {
		const data = super.getData();
       return data;
    }

    setPosition() {
		if (!this.object) return;
        const position = {
	        width: canvas.grid.size *1.2,
            height: canvas.grid.size *.8,
            left: this.object.center.x+20,
			top: this.object.center.y+20,
      "font-size": canvas.grid.size / 3.5 + "px",
      "display" : "grid"
        };
	    this.element.css(position);
    }
}
