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

Diagram.Port = function(id, name, direction, block, colour) {
    var _this = this;

    this.id           = id;
    this.name         = name;
    this.direction    = direction || Diagram.Constants.DIRECTION.INPUT;
    this.block        = block;
    this.ref          = null;
    this.callback     = null;
    this.connections  = [];
    this.colour       = colour || Diagram.Constants.STYLE.WIRE.COLOUR;
    this.constant_tie = null;

    this.label       = new Diagram.Label(_this.name, '10px');
    this.bounds      = new Diagram.Bounds(0, 0, 0, 0); // Relative bounds
    this.drawn       = new Diagram.Bounds(0, 0, 0, 0); // Absolute bounds
    this.dot_bounds  = new Diagram.Bounds(
        0, 0,
        Diagram.Constants.LAYOUT.PORT_DOT_SIZE,
        Diagram.Constants.LAYOUT.PORT_DOT_SIZE
    );

    this.addConnection = function(conn) { _this.connections.push(conn); };

    this.setConstantTie = function(tie) { _this.constant_tie = tie; };
    this.getConstantTie = function() { return _this.constant_tie; };

    // -------------------------------------------------------------------------
    // Port Layout
    // -------------------------------------------------------------------------

    this.layout = function() {
        var dot_size = Diagram.Constants.LAYOUT.PORT_DOT_SIZE;

        // ---------------------------------------------------------------------
        // 1. Place the label
        // ---------------------------------------------------------------------
        _this.label.layout();
        if (_this.direction == Diagram.Constants.DIRECTION.OUTPUT) {
            _this.label.setCoords(-1*(dot_size*2+_this.label.getBounds().width), 0);
        } else {
            _this.label.setCoords(0, 0);
        }

        // ---------------------------------------------------------------------
        // 2. Work out the total size of the port
        // ---------------------------------------------------------------------
        var label_bounds = _this.label.getBounds();
        _this.bounds.width  = (dot_size * 2) + label_bounds.width;
        _this.bounds.height = label_bounds.height;

    };

    // -------------------------------------------------------------------------
    // Port Position
    // -------------------------------------------------------------------------

    this.getBounds = function() {
        return _this.bounds;
    };

    this.setCoords = function(x_or_c, y) {
        _this.bounds.setCoords(x_or_c, y);
    };

    // -------------------------------------------------------------------------
    // Port Render
    // -------------------------------------------------------------------------
    this.setColour = function(c) { _this.colour = c; };
    this.getColour = function() { return _this.colour; };

    this.render = function(ctx, abs_root) {
        var dot_size = Diagram.Constants.LAYOUT.PORT_DOT_SIZE;

        _this.drawn.x      = abs_root.x + _this.bounds.x;
        _this.drawn.y      = abs_root.y + _this.bounds.y;
        _this.drawn.width  = _this.bounds.width;
        _this.drawn.height = _this.bounds.height;

        // ---------------------------------------------------------------------
        // 1. Render the dot
        // ---------------------------------------------------------------------
        _this.dot_bounds.x = parseInt(_this.drawn.x - (dot_size / 2.0));
        _this.dot_bounds.y = parseInt(_this.drawn.y - (dot_size / 2.0));

        ctx.fillStyle   = _this.colour;
        ctx.strokeStyle = _this.colour;
        ctx.lineWidth   = 1;

        // If this port is tied to a constant, draw as a dot
        if (_this.constant_tie) {
            ctx.beginPath();
            ctx.arc(
                _this.dot_bounds.x + parseInt(dot_size/2),
                _this.dot_bounds.y,
                parseInt(dot_size/2),
                0,
                2*Math.PI
            );
            ctx.fill();

            ctx.beginPath();
            ctx.arc(
                _this.dot_bounds.x + parseInt(dot_size/2),
                _this.dot_bounds.y,
                parseInt(dot_size/2)+2,
                0,
                2*Math.PI
            );
            ctx.stroke();

        // If this port is connected normally, draw as a square
        } else {
            ctx.fillRect(
                _this.dot_bounds.x,
                parseInt(_this.dot_bounds.y-dot_size/2),
                _this.dot_bounds.width, _this.dot_bounds.height
            );
        }

        // ---------------------------------------------------------------------
        // 2. Render the label
        // ---------------------------------------------------------------------
        var label_abs = new Diagram.Coords(
            abs_root.x + _this.bounds.x + dot_size,
            abs_root.y + _this.bounds.y - dot_size*2
        );
        _this.label.render(ctx, label_abs);
    };

    // -------------------------------------------------------------------------
    // Interaction
    // -------------------------------------------------------------------------

    this.setCallback = function(cb) { _this.callback = cb; };
    this.getCallback = function() { return _this.callback; };

    this.setReference = function(ref) { _this.ref = ref; };
    this.getReference = function() { return _this.ref; };

    // Function: resolveCoordinate
    // Determine if this port exists at the requested coordinates
    //
    this.resolveCoordinate = function(x, y) {
        var dot_size = Diagram.Constants.LAYOUT.PORT_DOT_SIZE;
        if (
            (x >= (_this.drawn.x - 2*dot_size) && x <= (_this.drawn.x + 2*dot_size)) &&
            (y >= (_this.drawn.y - 2*dot_size) && y <= (_this.drawn.y + 2*dot_size))
        ) {
            return _this;
        } else {
            return null;
        }
    };

};
