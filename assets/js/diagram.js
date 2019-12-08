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

// Create a namespace
var Diagram = Diagram || {};

Diagram.Constants = {
    DIRECTION : {
        UNSET : 0,
        INPUT : 1,
        OUTPUT: 2,
        INOUT : 3
    },
    STYLE: {
        WIRE: {
            WIDTH : 1,
            COLOUR: '#000'
        },
        LABEL: {
            FONT  : 'helvetica',
            SIZE  : '12px',
            COLOUR: '#000'
        }
    },
    PALETTE: [
        '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#d35400',
        '#0652DD', '#1B1464', '#6F1E51', '#D980FA', '#ED4C67'
    ],
    LAYOUT: {
        GRID_SPACING : 5,
        BLOCK_SPACING: 50,
        BLOCK_PADDING: 10, // How close items can get to the boundary of the block
        PORT_DOT_SIZE: 6,
        PORT_SPACING : 20
    }
};

Diagram.Coords = function(x,y) {
    this.x = x;
    this.y = y

    var _this = this;
    _this.updateCoords = function(c) {
        _this.x = c.x;
        _this.y = c.y;
    };
};

Diagram.Bounds = function(x,y,width,height) {
    this.x      = x;
    this.y      = y;
    this.width  = width;
    this.height = height;

    var _this = this;
    this.getCoords = function() {
        return new Diagram.Coords(_this.x , _this.y);
    };

    _this.setCoords = function(x_or_c, y) {
        if (x_or_c instanceof Diagram.Coords) {
            _this.x = parseInt(x_or_c.x);
            _this.y = parseInt(x_or_c.y);
        } else {
            _this.x = parseInt(x_or_c);
            _this.y = parseInt(y);
        }
    };
};

Diagram.Index2D = function(x_idx, y_idx) {
    this.x = x_idx;
    this.y = y_idx;

    var _this = this;
    _this.updateIndex = function(i) {
        _this.x = i.x;
        _this.y = i.y;
    };
};

Diagram.Top = function(id) {

    this.id            = id;
    this.canvas        = new Diagram.Canvas(id, this);
    this.blocks        = [];
    this.show_grid     = true;
    this.route_signals = true;

    // Create reference to this (where scope changes)
    var _this = this;

    this.reset = function() {
        _this.blocks = [];
        _this.canvas.resetPosition();
        _this.render();
    };

    this.setShowGrid = function(en) { _this.show_grid = en; };
    this.getShowGrid = function() { return _this.show_grid; };

    this.setRouteSignals = function(en) { _this.route_signals = en; };
    this.getRouteSignals = function() { return _this.route_signals; };

    this.createBlock = function(id, name) {
        // Always create a visible top-level block
        var block = new Diagram.Block(id, name, _this, 0, true);
        _this.blocks.push(block);
        return block;
    };

    // Function: layout
    // Layout the design. Place blocks bottom-up in order to calculate a correct
    // spacing. Place ports on blocks.
    //
    this.layout = function() {
        // Layout each root block in a column
        var base  = new Diagram.Coords(0,0);
        console.log(base);
        var index = new Diagram.Index2D(0,0);
        _this.blocks.forEach(function(block) {
            var blk_base = new Diagram.Coords(base.x, base.y);
            var blk_idx  = new Diagram.Index2D(index.x, index.y);
            block.layout(blk_base, blk_idx);
            var bounds = block.getBounds();
            base.y  += bounds.height + Diagram.Constants.LAYOUT.BLOCK_SPACING;
            index.y += 1;
        });
    };

    // Function: route
    // Routes visible connections between ports in the design.
    //
    this.route = function() {
        if (!_this.getRouteSignals()) return;
        _this.blocks.forEach(function(block) {
            block.route();
        });
    };

    // Function: render
    // Draws an already laid out and routed design.
    //
    this.render = function() {
        // Reset the canvas
        _this.canvas.clearCanvas();

        // Draw the grid
        if (_this.getShowGrid()) _this.canvas.drawGrid(false, false, 2);

        // Render each root block
        _this.blocks.forEach(function(block) {
            var blk_base = new Diagram.Coords(
                Diagram.Constants.LAYOUT.BLOCK_SPACING*1+310,
                Diagram.Constants.LAYOUT.BLOCK_SPACING*1+30
            );
            block.render(_this.canvas.getContext(), blk_base);
        });
    };

    // Function: resolveCoordinate
    // Resolve an X/Y coordinate set to the block on the canvas where the click
    // was made.
    //
    this.resolveCoordinate = function(x, y) {
        for (var i = 0; i < _this.blocks.length; i++) {
            var resolved = _this.blocks[i].resolveCoordinate(x, y);
            if (resolved) return resolved;
        }
    };

};
