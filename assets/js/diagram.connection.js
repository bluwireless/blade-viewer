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

Diagram.Connection = function(start_port, end_port, width, colour) {

    var _this = this;

    this.start_port = start_port;
    this.end_port   = end_port;
    this.width      = width || Diagram.Constants.STYLE.WIRE.WIDTH;
    this.colour     = colour || Diagram.Constants.STYLE.WIRE.COLOUR;

    this.path       = [];
    this.visible    = false;

    // Link the connection to the endpoints
    _this.start_port.addConnection(_this);
    _this.end_port.addConnection(_this);

    // -------------------------------------------------------------------------
    // Sanity Check
    // -------------------------------------------------------------------------

    if (this.start_port.direction != _this.end_port.direction) {
        if (
            (this.start_port.direction != Diagram.Constants.DIRECTION.OUTPUT) &&
            (this.start_port.direction != Diagram.Constants.DIRECTION.INOUT )
        ) {
            console.error("Connection start port is not of type OUTPUT or INOUT");
        }
        if (
            (this.end_port.direction != Diagram.Constants.DIRECTION.INPUT) &&
            (this.end_port.direction != Diagram.Constants.DIRECTION.INOUT)
        ) {
            console.error("Connection end port is not of type INPUT or INOUT");
        }
    }

    // -------------------------------------------------------------------------
    // Connection layout
    // -------------------------------------------------------------------------

    this.setPath   = function(path) { _this.path = path; };
    this.clearPath = function() { _this.path = []; };

    // -------------------------------------------------------------------------
    // Connection render
    // -------------------------------------------------------------------------

    this.isRouted   = function() { return _this.path.length > 0 };

    this.setVisible = function(en) { _this.visible = en; };
    this.getVisible = function() { return _this.visible; };

    this.setColour = function(c) { _this.colour = c; };
    this.getColour = function() { return _this.colour; };

    this.render = function(ctx, abs_root) {
        if (!_this.getVisible()) return;

        // Setup the line drawing
        ctx.strokeStyle = _this.colour;
        ctx.lineWidth   = _this.width;
        ctx.beginPath();

        // If there is no path routed, draw flight lines
        if (_this.path.length < 2) {
            var start_x = abs_root.x + _this.start_port.getBounds().x;
            var start_y = abs_root.y + _this.start_port.getBounds().y;
            var end_x   = abs_root.x + _this.end_port.getBounds().x;
            var end_y   = abs_root.y + _this.end_port.getBounds().y;

            if (_this.start_port.block.layer < _this.end_port.block.layer) {
                end_x   += _this.end_port.block.getBounds().x;
                end_y   += _this.end_port.block.getBounds().y;
            } else if (_this.start_port.block.layer > _this.end_port.block.layer) {
                start_x += _this.start_port.block.getBounds().x;
                start_y += _this.start_port.block.getBounds().y;
            } else if (_this.start_port.block.layer == _this.end_port.block.layer) {
                end_x   += _this.end_port.block.getBounds().x;
                end_y   += _this.end_port.block.getBounds().y;
                start_x += _this.start_port.block.getBounds().x;
                start_y += _this.start_port.block.getBounds().y;
            }

            ctx.moveTo(start_x+0.5, start_y+0.5);
            ctx.lineTo(end_x  +0.5, end_y  +0.5);

        // Otherwise, draw the routed path out
        } else {
            // Place the start point
            ctx.moveTo(
                abs_root.x+_this.path[0][0]+0.5,
                abs_root.y+_this.path[0][1]+0.5
            );

            // Draw to all remaining points
            for (var i = 1; i < _this.path.length; i++) {
                ctx.lineTo(
                    abs_root.x+_this.path[i][0]+0.5,
                    abs_root.y+_this.path[i][1]+0.5
                );
            }

        }

        // Draw the path
        ctx.stroke();
    };

};
