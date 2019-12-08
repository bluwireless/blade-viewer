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

Diagram.Block = function(id, name, parent, layer, display) {
    var _this = this;

    _this.id       = id;
    _this.name     = name;
    _this.parent   = parent;
    _this.layer    = (layer != null) ? layer : 0;
    _this.display  = (display || false);
    _this.callback = null;
    _this.ref      = null;

    _this.bounds = new Diagram.Bounds(0, 0, 0, 0); // Relative bounds
    _this.drawn  = new Diagram.Bounds(0, 0, 0, 0); // Absolute bounds
    _this.index  = new Diagram.Index2D(0, 0);

    _this.label       = new Diagram.Label(_this.name, '12px');
    _this.subblocks   = [];
    _this.clock_ports = [];
    _this.reset_ports = [];
    _this.other_ports = [];
    _this.connections = [];

    // -------------------------------------------------------------------------
    // Block Setup
    // -------------------------------------------------------------------------

    _this.addSubblock = function(id, name) {
        var block = new Diagram.Block(id, name, _this, (_this.layer+1));
        _this.subblocks.push(block);
        return block;
    };

    _this.addPort = function(id, name, direction) {
        var port = new Diagram.Port(id, name, direction, _this);
        if (
            (name.toLowerCase().indexOf('clk'  ) >= 0) ||
            (name.toLowerCase().indexOf('clock') >= 0)
        ) {
            _this.clock_ports.push(port);
        } else if (
            (name.toLowerCase().indexOf('rst'  ) >= 0) ||
            (name.toLowerCase().indexOf('reset') >= 0)
        ) {
            _this.reset_ports.push(port);
        } else {
            _this.other_ports.push(port);
        }
        return port;
    };

    _this.allPorts = function() {
        return _this.clock_ports.concat(_this.reset_ports).concat(_this.other_ports);
    };

    _this.createConnection = function(start_port, end_port) {
        var connection = new Diagram.Connection(start_port, end_port, _this);
        _this.connections.push(connection);
        return connection;
    };

    _this.inputPorts = function() {
        return _this.allPorts().filter(function(item) {
            return (item.direction == Diagram.Constants.DIRECTION.INPUT);
        });
    };

    _this.outputPorts = function() {
        return _this.allPorts().filter(function(item) {
            return (item.direction == Diagram.Constants.DIRECTION.OUTPUT);
        });
    };

    _this.inoutPorts = function() {
        return _this.allPorts().filter(function(item) {
            return (item.direction == Diagram.Constants.DIRECTION.INOUT);
        });
    };

    // -------------------------------------------------------------------------
    // Block layout
    // -------------------------------------------------------------------------

    _this.setDisplay = function(d) { _this.display = d; };
    _this.getDisplay = function() { return _this.display; };

    _this.layout = function() {
        // If we're not displayed, then don't layout!
        if (!_this.getDisplay()) return;

        // Clear any previously calculated layout & routing
        _this.bounds    = new Diagram.Bounds(0, 0, 0, 0);
        _this.drawn     = new Diagram.Bounds(0, 0, 0, 0);
        _this.index     = new Diagram.Index2D(0, 0);
        _this.grid_base = null;
        _this.grid_safe = null;
        _this.connections.forEach(function(c) { c.clearPath(); });

        // Pickup any constants we need
        var grid_space  = Diagram.Constants.LAYOUT.GRID_SPACING;

        // ---------------------------------------------------------------------
        // 1. Let child blocks run layout (without X or Y offsets)
        // ---------------------------------------------------------------------
        var next_idx         = new Diagram.Index2D(0,0);
        var visible_children = 0;
        var block_grid       = [[]];
        _this.subblocks.forEach(function(block) {
            // Check if the child is visible
            if (!block.getDisplay()) return;

            // Layout the child's position
            var child_pos = new Diagram.Coords(0, 0);
            var child_idx = new Diagram.Index2D(next_idx.x, next_idx.y);
            block.layout(child_pos, child_idx);

            // Create as many rows are as required
            while (block_grid.length < (next_idx.y + 1)) {
                block_grid.push([]);
            }

            // Create as many null columns as are required
            while (block_grid[next_idx.y].length < next_idx.x) {
                block_grid[next_idx.y].push(null);
            }

            // Add this block to the grid
            block_grid[next_idx.y].push(block);

            // Track sub-block drawing
            visible_children += 1;
            next_idx.x       += 1;
            // next_idx.y += 1; TODO: Spread over a 2D arrangement
        });

        // One row has been filled
        if (_this.subblocks.length > 0) next_idx.y += 1;

        // ---------------------------------------------------------------------
        // 2. Layout child blocks in the grid
        // ---------------------------------------------------------------------
        var row_heights = [];
        var col_widths  = [];

        // Work out row heights for child blocks
        for (var y = 0; y < next_idx.y; y++) {
            var max_height = 0;
            block_grid[y].forEach(function(block) {
                if (block == null) return;
                var bounds = block.getBounds();
                if (bounds.height > max_height) max_height = bounds.height;
            });
            row_heights.push(max_height);
        }

        // Work out column widths for child blocks
        for (var x = 0; x < next_idx.x; x++) {
            var max_width = 0;
            block_grid.forEach(function(row) {
                if (x >= row.length || row[x] == null) return;
                var bounds = row[x].getBounds();
                if (bounds.width > max_width) max_width = bounds.width;
            });
            col_widths.push(max_width);
        }

        // Layout the blocks in the grid
        var child_height = 0;
        var child_width  = 0;
        for (var y = 0; y < next_idx.y; y++){
            var row_height = row_heights[y];
            var current_x  = 0;
            for (var x = 0; x < next_idx.x; x++) {
                var col_width = col_widths[x];
                if (block_grid[y][x] != null) {
                    var x_pos = current_x;
                    var y_pos = child_height;
                    // Ensure that X & Y align to the grid
                    if ((x_pos % grid_space) > 0) x_pos -= (x_pos % grid_space);
                    if ((y_pos % grid_space) > 0) y_pos -= (y_pos % grid_space);
                    block_grid[y][x].setCoords(x_pos, y_pos);
                }
                current_x += col_width;
                // TODO: Calculate true inter-block spacing based on connections
                if ((x+1) < next_idx.x) current_x += Diagram.Constants.LAYOUT.BLOCK_SPACING;
            }
            child_height += row_height;
            // TODO: Calculate true inter-block spacing based on connections
            if ((y+1) < next_idx.y) child_height += Diagram.Constants.LAYOUT.BLOCK_SPACING;
            if (current_x > child_width) child_width = current_x;
        }

        // ---------------------------------------------------------------------
        // 3. Work out how much space is required for ports
        // ---------------------------------------------------------------------

        // Allow each port to run its layout routine
        _this.allPorts().forEach(function(port) { port.layout(); });

        // Work out the maximum input & output port widths
        var all_in  = _this.inputPorts().concat(_this.inoutPorts());
        var all_out = _this.outputPorts();

        var max_in_width  = 0;
        all_in.forEach(function(port) {
            var bounds = port.getBounds();
            if (bounds.width > max_in_width) max_in_width = bounds.width;
        });

        var max_out_width  = 0;
        all_out.forEach(function(port) {
            var bounds = port.getBounds();
            if (bounds.width > max_out_width) max_out_width = bounds.width;
        });

        // Work out the total height of the input ports
        var sum_in_height  = ((all_in.length  - 1) * Diagram.Constants.LAYOUT.PORT_SPACING);
        var sum_out_height = ((all_out.length - 1) * Diagram.Constants.LAYOUT.PORT_SPACING);
        var total_port_height = (sum_in_height > sum_out_height) ? sum_in_height : sum_out_height;

        // ---------------------------------------------------------------------
        // 4. Work out how much space is required for the label
        // ---------------------------------------------------------------------
        _this.label.layout();
        var label_width  = _this.label.getBounds().width;
        var label_height = _this.label.getBounds().height;

        // ---------------------------------------------------------------------
        // 5. Work out how big this block needs to be
        // ---------------------------------------------------------------------
        var block_width = child_width;

        // Compensate for port sizes
        block_width += max_in_width + max_out_width;
        if (visible_children > 0) {
            block_width += 2 * Diagram.Constants.LAYOUT.BLOCK_SPACING;
        }
        // TODO: Compensate for number of connections needing to be routed

        if (block_width < label_width) {
            block_width = label_width + 2 * Diagram.Constants.LAYOUT.BLOCK_PADDING;
        }

        var block_height = child_height + _this.label.getBounds().height;
        if (visible_children > 0) {
            block_height += 2 * Diagram.Constants.LAYOUT.BLOCK_SPACING;
        }
        if (block_height < total_port_height) {
            block_height += total_port_height;
        }
        // Pad: Above label, below label, and at bottom of the block
        block_height += 3 * Diagram.Constants.LAYOUT.BLOCK_PADDING;

        // Round up to the nearest grid spacing
        if ((block_width % grid_space) > 0) {
            block_width += (grid_space - (block_width % grid_space));
        }
        if ((block_height % grid_space) > 0) {
            block_height += (grid_space - (block_height % grid_space));
        }

        // Update the bounds
        _this.bounds.width  = block_width;
        _this.bounds.height = block_height;

        // ---------------------------------------------------------------------
        // 6. Adjust block label & subblock placements
        // ---------------------------------------------------------------------
        var label_x = parseInt((block_width - label_width) / 2);
        var label_y = Diagram.Constants.LAYOUT.BLOCK_PADDING;
        _this.label.setCoords(label_x, label_y)

        var root_x  = max_in_width + Diagram.Constants.LAYOUT.BLOCK_SPACING;
        var root_y  = label_y + label_height
        root_y     += Diagram.Constants.LAYOUT.BLOCK_PADDING;
        root_y     += Diagram.Constants.LAYOUT.BLOCK_SPACING;
        _this.subblocks.forEach(function(b) {
            var bounds = b.getBounds();
            b.setCoords(bounds.x + root_x, bounds.y + root_y);
        });

        // ---------------------------------------------------------------------
        // 7. Place ports on the block
        // ---------------------------------------------------------------------

        // Work out the starting Y coordinate
        var start_y  = label_height;
        start_y     += (2 * Diagram.Constants.LAYOUT.BLOCK_PADDING)
        start_y     += 2 * Diagram.Constants.LAYOUT.GRID_SPACING;

        // Place each input or in-out port
        var left_ports  = _this.inputPorts().concat(_this.inoutPorts());
        var next_left_y = start_y;

        left_ports.forEach(function(port) {
            port.setCoords(0, next_left_y);
            next_left_y += Diagram.Constants.LAYOUT.PORT_SPACING;
        });

        // Place each output port
        var right_ports  = _this.outputPorts();
        var next_right_y = start_y;

        right_ports.forEach(function(port) {
            port.setCoords(block_width, next_right_y);
            next_right_y += Diagram.Constants.LAYOUT.PORT_SPACING;
        });
    };

    // -------------------------------------------------------------------------
    // Connection Routing
    // -------------------------------------------------------------------------
    _this.grid_base = null;
    _this.grid_safe = null;

    _this.route = function() {
        // If we're not displayed, don't route
        if (!_this.getDisplay()) return;

        // First allow all children to route
        _this.subblocks.forEach(function(b) { b.route(); });

        // Now root this level
        var grid_space = Diagram.Constants.LAYOUT.GRID_SPACING;
        var gridPt = function(v) { return parseInt(v/grid_space); };

        // If we haven't calculated it, generate the grid
        if (!_this.grid_base) {
            var size_x      = gridPt(_this.bounds.width ) + 1;
            var size_y      = gridPt(_this.bounds.height) + 1;
            _this.grid_base = new PF.Grid(size_x, size_y);

            // Exclude the perimeter
            for (var x = 0; x < size_x; x++) {
                for (var y = 0; y < 4; y++) {
                    _this.grid_base.setWalkableAt(x, y, false);
                }
                _this.grid_base.setWalkableAt(x, size_y-1, false);
            }
            for (var y = 0; y < size_y; y++) {
                _this.grid_base.setWalkableAt(0,        y, false);
                _this.grid_base.setWalkableAt(size_x-1, y, false);
            }

            // Allow the ports
            _this.allPorts().forEach(function(port) {
                var bounds = port.getBounds();
                _this.grid_base.setWalkableAt(gridPt(bounds.x), gridPt(bounds.y));
            });

            // For each subblock
            _this.subblocks.forEach(function(block) {
                // Don't try to include any invisible blocks
                if (!block.getDisplay()) return;
                // Set the body & perimeter to be off limits
                var b_bounds = block.getBounds();
                var start_x  = gridPt(b_bounds.x);
                var start_y  = gridPt(b_bounds.y);
                var size_x   = gridPt(b_bounds.width);
                var size_y   = gridPt(b_bounds.height);
                for (var x = start_x; x <= (start_x + size_x); x++) {
                    for (var y = start_y; y <= (start_y + size_y); y++) {
                        _this.grid_base.setWalkableAt(x, y, false);
                    }
                }
                // For each port, create an exception
                block.allPorts().forEach(function(port) {
                    var p_bounds = port.getBounds();
                    _this.grid_base.setWalkableAt(
                        gridPt(b_bounds.x + p_bounds.x),
                        gridPt(b_bounds.y + p_bounds.y)
                    );
                });
            });
        }

        // Create a 'safe' grid for tracking where vertices are already used
        if (!_this.grid_safe) _this.grid_safe = _this.grid_base.clone();

        // For each connection, use PathFinding.js to route the connection
        var finder = new PF.AStarFinder({
            avoidStaircase: true,
            turnPenalty   : 0.1
        });

        _this.connections.forEach(function(conn) {
            // Don't route invisible paths, or already routed paths
            if (!conn.getVisible() || conn.isRouted()) return;

            // Check if the ends of the path are both displayed
            if (
                !conn.start_port.block.getDisplay() ||
                !conn.end_port.block.getDisplay()
            ) return;

            // Get the start & end port positions
            var tmp_grid  = _this.grid_safe.clone();
            var start_pt  = conn.start_port.getBounds();
            var end_pt    = conn.end_port.getBounds();

            // Get the start point
            var start_x = start_pt.x; var start_y = start_pt.y;
            var end_x   = end_pt.x;   var end_y   = end_pt.y;

            // If drawing between two children, need to compensate for offsets
            if (conn.start_port.block.layer > _this.layer) {
                var start_blk = conn.start_port.block.getBounds();
                start_x += start_blk.x; start_y += start_blk.y;
            }
            if (conn.end_port.block.layer > _this.layer) {
                var end_blk   = conn.end_port.block.getBounds();
                end_x   += end_blk.x;   end_y   += end_blk.y;
            }

            // Find the vertices of a routeable path
            var path = [];
            try {
                path = PF.Util.compressPath(finder.findPath(
                    gridPt(start_x), gridPt(start_y), gridPt(end_x), gridPt(end_y),
                    tmp_grid
                ));
            } catch(e) {
                console.log('Safe routing failed: ', e);
            }

            // If we failed to route, try removing overlap constraint
            if (path.length == 0) {
                tmp_grid = _this.grid_base.clone();
                path = PF.Util.compressPath(finder.findPath(
                    gridPt(start_x), gridPt(start_y), gridPt(end_x), gridPt(end_y),
                    tmp_grid
                ));

            // Otherwise, remove vertices from allowed grid to discourage overlapping
            } else {
                for (var i = 1; i < (path.length - 1); i++) {
                    _this.grid_safe.setWalkableAt(path[i][0], path[i][1], false);
                }
            }

            // Convert the path to relative coordinates
            for (var i = 0; i < path.length; i++) {
                path[i] = [path[i][0]*grid_space, path[i][1]*grid_space];
            }

            // Update the connection with the path it should follow
            conn.setPath(path);
        });

    };

    // -------------------------------------------------------------------------
    // Block position
    // -------------------------------------------------------------------------

    _this.getBounds = function() {
        return _this.bounds;
    };

    _this.setCoords = function(x_or_c, y) {
        _this.bounds.setCoords(x_or_c, y);
    };

    // -------------------------------------------------------------------------
    // Rendering
    // -------------------------------------------------------------------------

    // Function: render
    // Render the block at it's final position
    // @param abs_root - A coordinate of the top-left corner of the block, so
    //                   that relative coordinates can be adjusted.
    //
    _this.render = function(ctx, abs_root) {

        // Don't render a invisible block
        if (!_this.getDisplay()) return;

        // Store the absolute position of where this block is drawn
        _this.drawn.setCoords(abs_root);
        _this.drawn.width  = _this.bounds.width;
        _this.drawn.height = _this.bounds.height;

        // ---------------------------------------------------------------------
        // 1. Construct base rectangle
        // ---------------------------------------------------------------------
        ctx.strokeStyle = '#000';
        ctx.lineWidth   = 1;
        ctx.strokeRect(
            abs_root.x+0.5, abs_root.y+0.5, _this.bounds.width, _this.bounds.height
        );

        // ---------------------------------------------------------------------
        // 2. Draw the block label
        // ---------------------------------------------------------------------
        _this.label.render(ctx, abs_root);

        // ---------------------------------------------------------------------
        // 3. Draw each sub-block
        // ---------------------------------------------------------------------
        _this.subblocks.forEach(function(b) {
            var blk_bnd = b.getBounds();
            var blk_abs = new Diagram.Coords(
                (abs_root.x + blk_bnd.x), (abs_root.y + blk_bnd.y)
            );
            b.render(ctx, blk_abs);
        });

        // ---------------------------------------------------------------------
        // 4. Draw all connections
        // ---------------------------------------------------------------------
        _this.connections.forEach(function(c) {
            // Check if the ends of the path are both displayed
            if (!c.start_port.block.getDisplay() || !c.end_port.block.getDisplay()) return;
            // If visible, render
            c.render(ctx, abs_root);
        });

        // ---------------------------------------------------------------------
        // 5. Draw each port on the block (last so that the port dots sit top)
        // ---------------------------------------------------------------------
        _this.allPorts().forEach(function(p) {
            p.render(ctx, abs_root);
        });

    };

    // -------------------------------------------------------------------------
    // Interaction
    // -------------------------------------------------------------------------

    this.setCallback = function(cb) { _this.callback = cb; };
    this.getCallback = function() { return _this.callback; };

    this.setReference = function(ref) { _this.ref = ref; };
    this.getReference = function() { return _this.ref; };

    // Function: resolveCoordinate
    // Determine if this block, or a child or port, exists at the requested
    // coordinates
    //
    _this.resolveCoordinate = function(x, y) {
        var grid_space = Diagram.Constants.LAYOUT.GRID_SPACING;

        // Can't resolve if we're not visible
        if (!_this.getDisplay()) return;

        // Check it is within bounds (with some tolerance)
        if (
            (x < (_this.drawn.x - grid_space)                     ) ||
            (x > (_this.drawn.x + _this.drawn.width  + grid_space)) ||
            (y < (_this.drawn.y - grid_space)                     ) ||
            (y > (_this.drawn.y + _this.drawn.height + grid_space))
        ) return null;

        // See if any of the children can resolve this
        for (var i = 0; i < _this.subblocks.length; i++) {
            var resolved = _this.subblocks[i].resolveCoordinate(x, y);
            if (resolved) return resolved;
        }

        // Check if it hits any of the ports
        var ports = _this.allPorts();
        for (var i = 0; i < ports.length; i++) {
            var resolved = ports[i].resolveCoordinate(x, y);
            if (resolved) return resolved;
        }

        // Otherwise, click must have been on this block
        return _this;
    };
};
