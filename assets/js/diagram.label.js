// Copyright (C) 2019 Blu Wireless Ltd.
// All Rights Reserved.
//
// This file is part of DesignFormat.
//
// DesignFormat is free software: you can redistribute it and/or modify it under
// the terms of the GNU General Public License as published by the Free Software
// Foundation, either version 3 of the License, or (at your option) any later
// version.
//
// DesignFormat is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along with
// DesignFormat. If not, see <https://www.gnu.org/licenses/>.
//

var Diagram = Diagram || {};

Diagram.Label = function(text, font_size, font, colour) {
    var _this = this;

    _this.text      = text;
    _this.font_size = font_size || Diagram.Constants.STYLE.LABEL.SIZE;
    _this.font      = font || Diagram.Constants.STYLE.LABEL.FONT;
    _this.colour    = colour || Diagram.Constants.STYLE.LABEL.COLOUR;

    _this.bounds    = new Diagram.Bounds();

    _this.getFont = function() {
        return [_this.font_size, _this.font].join(' ');
    };

    // -------------------------------------------------------------------------
    // Label layout
    // -------------------------------------------------------------------------

    _this.layout = function() {
        // Work out the size of this label when laid out
        var tmp_canvas = document.createElement('canvas');
        var tmp_ctx    = tmp_canvas.getContext('2d');

        tmp_ctx.font = _this.getFont();
        var measures = tmp_ctx.measureText(_this.text);

        // Update the size stored in bounds
        _this.bounds.width  = parseInt(measures.width);
        _this.bounds.height = parseInt(/([\d]+)/.exec(_this.font_size)[1]);
    };

    // -------------------------------------------------------------------------
    // Label render
    // -------------------------------------------------------------------------

    _this.render = function(ctx, abs_root) {
        var x_point = _this.bounds.x + abs_root.x;
        var y_point = _this.bounds.y + abs_root.y;

        ctx.font         = _this.getFont();
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = _this.colour;
        ctx.fillText(_this.text, x_point, y_point);
    };

    // -------------------------------------------------------------------------
    // Label position
    // -------------------------------------------------------------------------

    _this.getBounds = function() {
        return _this.bounds;
    };

    _this.setCoords = function(x_or_c, y) {
        _this.bounds.setCoords(x_or_c, y);
    };

};
