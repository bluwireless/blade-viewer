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

Diagram.Canvas = function(id, top) {

    this.id          = id;
    this.top         = top;
    this.canvas      = document.getElementById(id);
    this.canvas_ctx  = this.canvas.getContext('2d');

    this.menu        = new Diagram.Menu(this);

    // Setup canvas
    this.last_zoom     = (new Date()).getTime();
    this.draw_offset   = { x: 0, y: 0 };
    this.current_scale = 1;
    this.scroll_zoom   = true;

    // Create reference to this (where scope changes)
    var _this = this;

    // -------------------------------------------------------------------------
    // Render/Layout Routines
    // -------------------------------------------------------------------------

    this.getContext = function() {
        return _this.canvas_ctx;
    };

    this.clearCanvas = function() {
        var bounds = _this.bounds();
        _this.canvas_ctx.clearRect(
            bounds.x, bounds.y, bounds.width, bounds.height
        );
    };

    this.resetPosition = function() {
        _this.canvas_ctx.translate(_this.draw_offset.x, _this.draw_offset.y);
        _this.draw_offset.x = 0;
        _this.draw_offset.y = 0;
        _this.clearCanvas();
    };

    this.drawGridInner = function(bounds, grid_space, stroke_style) {
        _this.canvas_ctx.strokeStyle = stroke_style;
        _this.canvas_ctx.beginPath();

        // Draw vertical lines first
        var current_x  = bounds.x - grid_space;
        if ((Math.abs(current_x) % grid_space) > 0) current_x += (grid_space - (current_x % grid_space));
        while (current_x <= bounds.x + bounds.width) {
            _this.canvas_ctx.moveTo(parseInt(current_x)+0.5, parseInt(bounds.y)+0.5);
            _this.canvas_ctx.lineTo(parseInt(current_x)+0.5, parseInt(bounds.y + bounds.height)+0.5);
            current_x += grid_space;
        }

        // Draw horizontal lines
        var current_y  = bounds.y - grid_space;
        if ((Math.abs(current_y) % grid_space) > 0) current_y += (grid_space - (current_y % grid_space));
        while (current_y <= bounds.y + bounds.height) {
            _this.canvas_ctx.moveTo(parseInt(bounds.x)+0.5, parseInt(current_y)+0.5);
            _this.canvas_ctx.lineTo(parseInt(bounds.x + bounds.width)+0.5, parseInt(current_y)+0.5);
            current_y += grid_space;
        }

        // Now render the path
        _this.canvas_ctx.stroke();
    }

    this.drawGrid = function(hide_fine, hide_coarse, multiple) {
        var bounds     = _this.bounds();
        var grid_space = Diagram.Constants.LAYOUT.GRID_SPACING;

        if(!(hide_fine == true)) {
            _this.drawGridInner(bounds, grid_space*(multiple || 1), 'rgba(0,0,0,0.025)');
        }

        if (!(hide_coarse == true)) {
            _this.drawGridInner(bounds, grid_space*(multiple || 1)*10, 'rgba(0,0,0,0.05)');
        }
    };

    this.bounds = function() {
        var bounds = new Diagram.Bounds(
            _this.draw_offset.x, _this.draw_offset.y,
            _this.canvas.width*(1.0/_this.current_scale),
            _this.canvas.height*(1.0/_this.current_scale)
        );
        return bounds;
    };

    // Function: enableScrollZoom
    // Enable zooming when scrolling the mouse wheel.
    //
    this.enableScrollZoom = function(enable) {
        _this.scroll_zoom = enable;
    };

    // Function: zoom
    // Change the zoom level on the canvas by step, +1 zooms in, -1 zooms out,
    // and 0 resets the zoom level.
    //
    this.zoom = function(mode) {
        // Limit the zoom
        if(
            (mode < 0 && _this.current_scale < 0.125) ||
            (mode > 0 && _this.current_scale > 8)
        ) {
            return;
        }
        // Apply the scale
        if (mode > 0) {
            _this.canvas_ctx.scale(2, 2);
            _this.draw_offset.x *= 0.5;
            _this.draw_offset.y *= 0.5;
            _this.current_scale *= 2;
        } else if (mode < 0) {
            _this.canvas_ctx.scale(0.5, 0.5);
            _this.draw_offset.x *= 2;
            _this.draw_offset.y *= 2;
            _this.current_scale *= 0.5;
        } else if (mode == 0) {
            _this.canvas_ctx.setTransform(1, 0, 0, 1, 0, 0);
            _this.draw_offset   = { x: 1, y: 1 };
            _this.current_scale = 1;
        }
        // Re-render
        _this.top.render();
        // Stop the scroll event propagating
        e.preventDefault();
        e.stopPropagation();
    };

    // -------------------------------------------------------------------------
    // Mouse Interactions
    // -------------------------------------------------------------------------

    this.canvas.addEventListener('wheel', function(e) {
        // Don't allow the event to propagate
        e.preventDefault();
        e.stopPropagation();
        // Check zooming with the scroll wheel is enabled
        if (!_this.scroll_zoom) return;
        // Don't allow multiple zooms within 100 ms
        var this_zoom = (new Date()).getTime();
        if ((this_zoom - _this.last_zoom) < 300) return;
        _this.last_zoom = this_zoom;
        // Apply the scale
        if      (e.deltaY > 0) _this.zoom(1);
        else if (e.deltaY < 0) _this.zoom(-1);
    });

    this.canvas.addEventListener('mousedown', function(e) {
        if (e.button != 2 && !_this.menu.isDisplayed()) { // Don't act on right click
            _this.canvas.isDragging = true;
            _this.canvas.selection  = false;
            var snap_data = _this.canvas.toDataURL('image/png');
            var snap_img  = new Image();
            snap_img.src  = snap_data;
            _this.canvas.snapshot     = snap_img;
            _this.canvas.start_offset = {
                x: _this.draw_offset.x,
                y: _this.draw_offset.y
            };
            _this.canvas.lastPosX     = e.clientX;
            _this.canvas.lastPosY     = e.clientY;
        } else if (_this.menu.isDisplayed()) {
            _this.menu.hideMenu();
        }
        e.preventDefault();
        e.stopPropagation();
    });

    this.canvas.addEventListener('mousemove', function(e) {
        if (_this.canvas.isDragging) {
            var delta_x = (e.clientX - _this.canvas.lastPosX) / _this.current_scale;
            var delta_y = (e.clientY - _this.canvas.lastPosY) / _this.current_scale;
            _this.draw_offset.x -= delta_x;
            _this.draw_offset.y -= delta_y;
            _this.canvas_ctx.translate(delta_x, delta_y);
            _this.clearCanvas();
            _this.canvas.lastPosX = e.clientX;
            _this.canvas.lastPosY = e.clientY;
            _this.top.render();
            // _this.canvas_ctx.drawImage(_this.canvas.snapshot, _this.canvas.start_offset.x, _this.canvas.start_offset.y);
        }
    });

    this.canvas.addEventListener('mouseup', function(e) {
        if (e.button != 2) { // Don't act on right click
            _this.canvas.isDragging = false;
            _this.canvas.selection  = true;
            _this.canvas.snapshot   = null;
            e.preventDefault();
            e.stopPropagation();
            _this.clearCanvas();
            _this.top.render();
        }
    });

    this.canvas.addEventListener('contextmenu', function(e) {
        // Work out the location of the click relative to the canvas
        var x = (e.offsetX * (1 / _this.current_scale)) + _this.draw_offset.x;
        var y = (e.offsetY * (1 / _this.current_scale)) + _this.draw_offset.y;

        // If we can find a block at this location, then show a context menu
        var candidate = _this.top.resolveCoordinate(x, y);
        console.log(candidate);
        if (candidate != null) {
            _this.menu.clearMenu();

            if (candidate instanceof Diagram.Block) {
                var cb = candidate.getCallback();

                if (candidate.subblocks.length > 0) {
                    _this.menu.addItem('Expand Block', function() {
                        if (cb) cb('expand', candidate);
                    });
                }

                _this.menu.addItem('Inspect Block', function() {
                    if (cb) cb('inspect', candidate);
                });

                _this.menu.addItem('Browse from Block', function() {
                    if (cb) cb('maketop', candidate);
                });

            } else if (candidate instanceof Diagram.Port) {

                var cb = candidate.getCallback();
                _this.menu.addItem('Show Port Connections', function() {
                    if (cb) cb('showfan', candidate);
                });

                _this.menu.addItem('Inspect Port', function() {
                    if (cb) cb('inspect', candidate);
                });

                _this.menu.addItem('Highlight Fan-out', function() {
                    if (cb) cb('highlightfanout', candidate);
                });

            }

            var copy_to_clipboard = function(text) {
                var input_el = document.createElement('textarea');
                input_el.value = text;
                input_el.style.width   = '1px';
                input_el.style.height  = '1px';
                input_el.style.opacity = 0;
                document.body.appendChild(input_el);
                input_el.select();
                var success = false;
                try {
                    success = document.execCommand('copy');
                } catch(e) {
                    success = false;
                    console.error('Failed to copy path: ', e);
                }
                document.body.removeChild(input_el);
                return success;
            };
            _this.menu.addItem('Copy Full Path', function() {
                var cb = candidate.getCallback();
                if (cb) {
                    var path = cb('fullpath', candidate);
                    if(copy_to_clipboard(path)) alert('Path copied to clipboard');
                }
            });
            _this.menu.displayMenu(e.clientX, e.clientY);

        // Otherwise just hide the menu
        } else if (_this.menu.isDisplayed()) {
            _this.menu.hideMenu();

        }

        e.preventDefault();
        e.stopPropagation();
    });

    this.canvas.addEventListener('dblclick', function(e) {
        var x = (e.offsetX * (1 / _this.current_scale)) + _this.draw_offset.x;
        var y = (e.offsetY * (1 / _this.current_scale)) + _this.draw_offset.y;

        // Search through all blocks to find which is targeted
        var candidate = _this.top.resolveCoordinate(x, y);
        if (!candidate) return;

        // Callback to the registered method
        var cb = candidate.getCallback();
        if (cb) {
            if (candidate instanceof Diagram.Block) {
                cb('expand', candidate);
            } else if (candidate instanceof Diagram.Port) {
                cb('showfan', candidate);
            }
        }
    });

};
