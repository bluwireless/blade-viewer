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

var UI = UI || {};

UI.rawdesign = null;
UI.project   = null;
UI.diagram   = null;
UI.filters   = {
    signals: {}
};
UI.colours   = {
    signals: {}
};
UI.connections = {};
UI.ports       = {};

UI.initialise = function() {
    if (document.readyState == 'complete') {
        UI.loadDesign(function(err, design) {
            if (err) {
                alert('An error occurred fetching the design, please try again');
                window.location.href='/';
                return;
            }

            // Store the raw design
            console.log('Storing Raw Design');
            UI.rawdesign = design;

            // Load the elaborated design into DesignFormat
            console.log('Converting to DFProject');
            UI.project = (new DFProject()).loadObject(design);

            // Create a diagram
            console.log('Creating Diagram');
            UI.diagram = new Diagram.Top('maincanvas');

            // Resize diagram once for luck
            console.log('Resizing');
            UI.autoresize();

            // Setup the design tree in the sidebar
            console.log('Creating Tree View');
            UI.setupTreeView(UI.project.getAllPrincipalNodes()[0]);

            // Setup the options panel in the sidebar
            console.log('Constructing Options');
            UI.setupOptions(UI.project);

            // Setup the top level ChipView
            console.log('Rendering Design');
            UI.setupChipView(UI.project.getAllPrincipalNodes()[0]);
        });
    }
};
document.addEventListener('readystatechange', UI.initialise);

UI.displayActivityIndicator = function(show) {
    if (show) document.getElementById('draw_activity').style.display = 'block';
    else      document.getElementById('draw_activity').style.display = 'none';
};

UI.autoresize = function() {
    var mainarea = document.getElementsByClassName('dashboard')[0];
    if (UI.isRetinaDisplay()) {
        UI.diagram.canvas.canvas.style.width  = mainarea.offsetWidth + 'px';
        UI.diagram.canvas.canvas.style.height = (mainarea.offsetHeight) + 'px';
        UI.diagram.canvas.canvas.width  = mainarea.offsetWidth * 2;
        UI.diagram.canvas.canvas.height = mainarea.offsetHeight * 2;
        UI.diagram.canvas.canvas_ctx.scale(2,2);
    } else {
        UI.diagram.canvas.canvas.width  = mainarea.offsetWidth;
        UI.diagram.canvas.canvas.height = mainarea.offsetHeight;
    }
    UI.diagram.canvas.resetPosition();
    UI.diagram.render();
};
window.addEventListener('resize', UI.autoresize);

UI.isRetinaDisplay = function() {
    if (window.matchMedia) {
        var mq = window.matchMedia("only screen and (min--moz-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen  and (min-device-pixel-ratio: 1.3), only screen and (min-resolution: 1.3dppx)");
        return (mq && mq.matches || (window.devicePixelRatio > 1));
    }
    return false;
};

// @function loadDesign
// Fetch the design from the linked URL
// @param function cb - The callback to execute when done (accept error & data)
//
UI.loadDesign = function(cb) {
    // Work out from the current URL when to get the design from
    var url = window.location.href + '/design';
    console.log('Fetching design from ' + url);

    // Fetch the design
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'blob'; // Return the binary blob - no processing
    xhr.addEventListener('loadstart', function(e) {
        console.log('Load Started:', e);
    });
    xhr.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            var perc_comp = (e.loaded / e.total) * 100.0;
            console.log('Load is %s% complete', perc_comp);
        }
    });
    xhr.addEventListener('load', function(e) {
        console.log('Load Complete:', e, this);
        if (this.status == 200) {
            var zip = new JSZip();
            zip.loadAsync(this.response)
               .then(function(zip) {
                   console.log('Unzipped Archive - Extracting File');
                   return zip.file("elaborated.json").async("string");
               })
               .then(function(text) {
                   console.log('Got Design - Parsing JSON');
                   return cb(null, JSON.parse(text));
               }, function(err) {
                   console.log('Unzip Failed:', err);
                   return cb(new Error('Zipped design data decompression failed'));
               });
        } else {
            return cb(new Error('Server generated error code ' + this.status));
        }
    });
    xhr.addEventListener('error', function(e) {
        console.log(e);
        return cb(new Error('Error occurred connecting to server'));
    });
    xhr.open('GET', url, true);
    xhr.send();
};

// @function setupTreeView
// Create a tree view for the elaborated design
// @param DFBlock design - top level design for the tree
//
UI.setupTreeView = function(design) {
    var recurseTree = function(block, prefix) {
        if (!prefix) prefix = block.id;
        else         prefix += '.' + block.id;
        var tree = [];
        block.children.forEach(function(child) {
            tree.push(recurseTree(child, prefix));
        });
        return {
            text    : block.id,
            id      : prefix,
            children: tree
        }
    };

    $('#treeview').jstree({
        core: {
            themes: { icons: false },
            data  : recurseTree(design)
        }
    }).on('select_node.jstree', function(e, data) {
        console.log(data.node.id);
        UI.setupChipView(UI.project.resolvePath(data.node.id));
    });
};

// @function setupOptions
// Setup the options panel for interacting with the design
// @param DFProject project - the project to display
//
UI.setupOptions = function(project) {
    // Create toggles for various draw options
    var options = ['Show Grid', 'Route Signals', 'Scroll Zoom'];
    var opt_toggles = UI.createToggleTable(options, true, function(type, en) {
        if (type == 'Show Grid') {
            UI.diagram.setShowGrid(en);
            UI.diagram.render();
        } else if (type == 'Route Signals') {
            UI.diagram.setRouteSignals(en);
            UI.diagram.render();
        } else if (type == 'Scroll Zoom') {
            UI.diagram.canvas.enableScrollZoom(en);
        }
    });
    var opt_tog_box = UI.createBox('Drawing Options', opt_toggles);

    // Create a toggle table for all interconnect types
    var types = [];
    Object.values(UI.project.getAllUsedInterconnectionTypes()).forEach(function(intc) {
        types.push(intc.id);
        UI.filters.signals[intc.id] = false;
    });
    var sig_toggles = UI.createToggleTable(types, false, function(type, show) {
        UI.filters.signals[type] = show;
        UI.colours.signals[type] = '#000';
        if (UI.connections[type]) {
            UI.connections[type].forEach(function(conn) {
                conn.setVisible(show);
            });
        }
        UI.diagram.route();
        UI.diagram.render();
    }, function(type, colour) {
        UI.colours.signals[type] = colour;
        if (UI.connections[type]) {
            UI.connections[type].forEach(function(conn) { conn.setColour(colour); });
        }
        if (UI.ports[type]) {
            UI.ports[type].forEach(function(port) { port.setColour(colour); });
        }
        UI.diagram.render();
    });
    var sig_tog_box = UI.createBox('Visible Types', sig_toggles);

    // Append children to the filter panel
    var option_panel = document.getElementById('panel-options');
    option_panel.innerHTML = '';
    option_panel.appendChild(opt_tog_box);
    option_panel.appendChild(sig_tog_box);
};

// @function setupChipView
// Create a ChipView for the elaborated design
// @param DFBlock design - top level design for the viewer
//
UI.setupChipView = function(design) {
    // Clear any previous state
    UI.connections = {};
    UI.ports       = {};
    UI.diagram.reset();

    // Display the activity indicator
    UI.displayActivityIndicator(true);

    // Declare recursive draw function
    var drawBlock = function(block, parent) {
        var drawn = null;

        // Create the block element (either top level or sub-block)
        if (parent) {
            drawn = parent.addSubblock(block.id, block.id);
            // Ensure the first two layers are drawn
            if (drawn.layer < 2) drawn.setDisplay(true);
        } else {
            drawn = UI.diagram.createBlock(block.id, block.id, null);
        }

        // Setup the expansion callback for the block
        drawn.setCallback(UI.blockActionCallback);
        drawn.setReference(block);

        // Add ports to this block
        var ports = {};
        var add_port = function(direction) {
            return function(port) {
                var d_port = drawn.addPort(port.name, port.name, direction);
                d_port.setReference(port);
                ports[port.name] = d_port;
                if(!UI.ports[port.type]) UI.ports[port.type] = [];
                UI.ports[port.type].push(d_port);
                if (UI.colours.signals[port.type]) {
                    d_port.setColour(UI.colours.signals[port.type]);
                }
            }
        };
        block.ports.input.forEach(add_port(Diagram.Constants.DIRECTION.INPUT));
        block.ports.output.forEach(add_port(Diagram.Constants.DIRECTION.OUTPUT));
        block.ports.inout.forEach(add_port(Diagram.Constants.DIRECTION.INOUT));

        // Add the action callback to each port
        Object.values(ports).forEach(function(p) {
            p.setCallback(UI.portActionCallback);
        });

        // Now draw all child elements
        var children = {};
        block.children.forEach(function(child) {
            children[child.id] = drawBlock(child, drawn);
        });

        // Add interconnections
        block.connections.forEach(function(conn) {
            var start_point = null;
            var end_point   = null;

            // Assess end point
            if (conn.end_port.block == block) {
                end_point = ports[conn.end_port.name];
            } else {
                end_point = children[conn.end_port.block.id][conn.end_port.name];
            }

            // Assess start point
            // - If the start point is a DFPort, work to form a connection
            if (conn.start_port instanceof DFPort) {
                if (conn.start_port.block == block) {
                    start_point = ports[conn.start_port.name];
                } else {
                    start_point = children[conn.start_port.block.id][conn.start_port.name];
                }
            // - If the start point is a constant tie, modify the drawing of the end port
            } else if (conn.start_port instanceof DFConstantTie) {
                end_point.setConstantTie(conn.start_port);
                // NOTE: We don't set 'end_point' as we don't need to build a connection
            }

            // Add connection
            if (start_point != undefined && end_point != undefined) {
                var net = drawn.createConnection(start_point, end_point);
                if (UI.filters.signals[conn.start_port.type]) {
                    net.setVisible(UI.filters.signals[conn.start_port.type]);
                }
                if (UI.colours.signals[conn.start_port.type]) {
                    net.setColour(UI.colours.signals[conn.start_port.type]);
                }
                if (!UI.connections[conn.start_port.type]) {
                    UI.connections[conn.start_port.type] = [];
                }
                UI.connections[conn.start_port.type].push(net);
            }
        });

        // Return the block so we can reference it
        return ports;
    };

    // Add the root block to the diagram
    drawBlock(design, null);

    // Perform layout, route and render
    UI.layoutRouteRender();

    // Hide the activity indicator
    UI.displayActivityIndicator(false);
};

// @function layoutRouteRender
// Perform a full layout, route and render of the diagram
//
UI.layoutRouteRender = function() {
    UI.diagram.layout();
    UI.diagram.route();
    UI.diagram.render();
};

// @function blockActionCallback
// Called when a callback is made from the Diagram for candidate Diagram.Block
//
UI.blockActionCallback = function(action, block) {
    if (action == 'expand') {
        (block.subblocks || []).forEach(function(b) {
            b.setDisplay(true);
        });
        UI.layoutRouteRender();
    } else if (action == 'maketop') {
        UI.setupChipView(block.ref);
    } else if (action == 'fullpath') {
        return block.getReference().hierarchicalPath();
    } else if (action == 'inspect') {
        UI.inspectDFObject(block.ref);
    }
};

// @function portActionCallback
// Called when a callback is made from the Diagram for candidate Diagram.Port
//
UI.portActionCallback = function(action, port) {
    if (action == 'showfan') {
        port.connections.forEach(function(conn) {
            // Ensure the terminating block of the connection is visible
            conn.end_port.block.setDisplay(true);
            // Ensure that the connection itself is visible
            conn.setVisible(true);
        });
        UI.layoutRouteRender();
    } else if (action == 'fullpath') {
        return port.getReference().hierarchicalPath();
    } else if (action == 'inspect') {
        UI.inspectDFObject(port.ref);
    } else if (action == 'highlightfanout') {
        var colour = randomColor({ luminosity: 'bright' });
        port.setColour(colour);
        port.connections.forEach(function(c) { c.setColour(colour); });
        UI.diagram.render();
    }
};

// @function inspectDFObject
// Redraw the inspection panel addressing the provided DF object
//
UI.inspectDFObject = function(df_obj) {
    var panel = document.getElementById('panel-inspector');
    panel.innerHTML = '';

    // Inspecting a DFBlock instance
    if (df_obj instanceof DFBlock) {
        var block = df_obj;

        // Setup headings
        var headings = ['Property', 'Value'];

        // Build rows of the table
        var rows = [];

        rows.push(['Name', block.id  ]);
        rows.push(['Type', block.type]);
        if (block.parent) rows.push(['Parent', block.parent.id]);
        Object.keys(block.attributes).forEach(function(key) {
            rows.push([key, block.attributes[key]]);
        });

        // Create table & box & insert into panel
        var attr_table = UI.createAttributesTable(headings, rows);
        var block_box  = UI.createBox('Block', attr_table);
        panel.appendChild(block_box);

        // Inspect all the ports
        var p_headings = ['Port', 'In/Out', 'Type'];
        var p_rows = [];

        block.getAllPorts().forEach(function(port) {
            p_rows.push([port.name, port.direction, port.type]);
        });

        var port_table = UI.createAttributesTable(p_headings, p_rows);
        var port_box   = UI.createBox('Block Ports', port_table, true);
        panel.appendChild(port_box);

        // Inspect unconnected ports on this block
        var u_headings = ['Port', 'In/Out', 'Type'];
        var u_rows     = [];

        block.getUnconnectedPorts().forEach(function(port) {
            u_rows.push([port.name, port.direction, port.type]);
        });

        if (u_rows.length > 0) {
            var unconn_table = UI.createAttributesTable(u_headings, u_rows);
            var unconn_box   = UI.createBox('Unconnected Ports', unconn_table, true);
            panel.appendChild(unconn_box);
        }

        // Inspect all the children
        var c_headings = ['Child', 'Type'];
        var c_rows = [];

        block.children.forEach(function(child) {
            c_rows.push([child.id, child.type]);
        });

        if (c_rows.length > 0) {
            var child_table = UI.createAttributesTable(c_headings, c_rows);
            var child_box   = UI.createBox('Block Children', child_table, true);
            panel.appendChild(child_box);
        }

        // Inspect unconnected ports on child blocks
        var uc_headings = ['Block', 'Port', 'In/Out', 'Type'];
        var uc_rows     = [];

        block.getUnconnectedChildPorts().forEach(function(port) {
            uc_rows.push([port.block.id, port.name, port.direction, port.type]);
        });

        if (uc_rows.length > 0) {
            var unconn_child_table = UI.createAttributesTable(uc_headings, uc_rows);
            var unconn_child_box   = UI.createBox('Child Unconnected', unconn_child_table, true);
            panel.appendChild(unconn_child_box);
        }

        // Inspect register definitions
        if (block.registers && block.registers.length > 0) {
            var contents = document.createElement('span');
            block.registers.forEach(function(reg_group) {
                reg_group.registers.forEach(function(register) {
                    var heading = document.createElement('h4');
                    heading.innerHTML = '0x'+register.getOffset().toString('16') + ': ' + register.id;
                    contents.appendChild(heading);

                    var f_headings = ['Range', 'Field', 'Reset'];
                    var f_rows = [];
                    register.fields.forEach(function(field) {
                        f_rows.push([(field.lsb+field.size-1) + ':' + field.lsb, field.id, '0x'+field.reset.toString('16')]);
                    });
                    var field_table = UI.createAttributesTable(f_headings, f_rows);
                    contents.appendChild(field_table);
                });
            });
            var register_box = UI.createBox('Registers', contents, true);
            panel.appendChild(register_box);
        }

    // Inspecting a DFPort instance
    } else if (df_obj instanceof DFPort) {
        var port = df_obj;

        // Build a table of port properties
        var headings = ['Property', 'Value'];
        var rows = [];
        rows.push(['Name', port.name]);
        rows.push(['Type', port.type]);
        if (parent) rows.push(['Parent', port.block.id]);
        Object.keys(port.attributes).forEach(function(key) {
            rows.push([key, port.attributes[key]]);
        });

        // Check to see if the port has a tie to a constant
        var ties = port.connections.filter(function(c) {
            return (c.start_port instanceof DFConstantTie);
        });
        if (ties.length > 0) {
            console.log(ties);
            rows.push(['Constant Tie', ties[0].start_port.value]);
        }

        // Create box for port attributes
        var attr_table = UI.createAttributesTable(headings, rows);
        var block_box  = UI.createBox('Port', attr_table);
        panel.appendChild(block_box);

        // Create box for interconnect attributes
        var intc = port.getInterconnectType();
        var intc_rows = [];
        intc_rows.push(['Name', intc.id]);
        intc_rows.push(['Role', intc.role]);
        Object.keys(intc.attributes).forEach(function(key) {
            intc_rows.push([key, intc.attributes[key]]);
        });
        var intc_table = UI.createAttributesTable(headings, intc_rows);
        var block_box  = UI.createBox('Interconnect', intc_table, true);
        panel.appendChild(block_box);

        // Create listing of master components
        var m_headings = ['Name', 'Type/Width'];
        var m_rows     = [];

        port.getInterconnectType().getMasterComponents().forEach(function(comp) {
            m_rows.push([
                comp.id,
                (comp.type == DFConstants.COMPONENT.COMPLEX) ? comp.ref : comp.width
            ]);
        });

        if (m_rows.length > 0) {
            var master_comps_table = UI.createAttributesTable(m_headings, m_rows);
            var master_comps_box   = UI.createBox('Master Components', master_comps_table, true);
            panel.appendChild(master_comps_box);
        }

        // Create listing of slave components
        var s_headings = ['Name', 'Type/Width'];
        var s_rows     = [];

        port.getInterconnectType().getSlaveComponents().forEach(function(comp) {
            s_rows.push([
                comp.id,
                (comp.type == DFConstants.COMPONENT.COMPLEX) ? comp.ref : comp.width
            ]);
        });

        if (s_rows.length > 0) {
            var slave_comps_table = UI.createAttributesTable(s_headings, s_rows);
            var slave_comps_box   = UI.createBox('Slave Components', slave_comps_table, true);
            panel.appendChild(slave_comps_box);
        }

    }

    // Switch panel focus to the inspector
    UI.switchControlTab('inspector');
};

// @function switchControlTab
// Switch between control panels in the UI sidebar
// @param active - The tab to activate
//
UI.switchControlTab = function(active) {
    var panel_holder = document.getElementById('panel-holder');
    var panels       = panel_holder.getElementsByClassName('panel');
    Array.from(panels).forEach(function(p) {
        // Find the associated tab
        var tab_id = 'tab-' + p.id.split('panel-')[1];
        var tab    = document.getElementById(tab_id);
        // Switch the panel's visibility
        if (p.id == ('panel-' + active)) {
            p.style.display = 'block';
            tab.setAttribute('class', 'btn btn-outline-info active');
        } else {
            p.style.display = 'none';
            tab.setAttribute('class', 'btn btn-outline-info');
        }
    });
};

// @function toggleBox
// Display or hide a box
// @param box_id - The ID of the box
//
UI.toggleBox = function(box) {
    if (typeof box == 'string') {
        box = document.getElementById('box-' + box);
    }
    var box_toggle = box.getElementsByClassName('expander')[0];
    var icon       = box_toggle.children[0];
    if (box.getAttribute('class').indexOf('closed') >= 0) {
        box.setAttribute('class', 'box');
        icon.setAttribute('class', 'fa fa-chevron-up');
    } else {
        box.setAttribute('class', 'box closed');
        icon.setAttribute('class', 'fa fa-chevron-down');
    }
};

// @function createBox
// Create a box and append a child element tree
// @param title - The title for the box
// @param tree - The element tree to use in the box
//
UI.createBox = function(title, tree, collapsed) {
    var box = document.createElement('div');
    if (collapsed) box.setAttribute('class', 'box closed');
    else           box.setAttribute('class', 'box');

    var header = document.createElement('h4');
    header.innerHTML = title;
    box.appendChild(header);

    var expander = document.createElement('span');
    expander.setAttribute('class', 'expander');
    expander.onclick = function() {
        UI.toggleBox(box);
    };

    var expand_icon = document.createElement('i');
    if (collapsed) expand_icon.setAttribute('class', 'fa fa-chevron-down');
    else           expand_icon.setAttribute('class', 'fa fa-chevron-up');
    expander.appendChild(expand_icon);

    box.appendChild(expander);

    var content = document.createElement('div');
    content.setAttribute('class','content');
    content.appendChild(tree);
    box.appendChild(content);

    return box;
};

// @function createToggleTable
// Draw a table of toggles for switching attributes on/off
//
UI.createToggleTable = function(toggles, default_en, callback, colour_cb) {
    var table = document.createElement('table');
    table.setAttribute('class', 'table toggle-table');
    var tbody = document.createElement('tbody');
    table.appendChild(tbody);

    toggles.forEach(function(toggle) {
        var tr = document.createElement('tr');
        // tr.style.tableLayout = 'fixed';
        table.appendChild(tr);

        var td_title = document.createElement('td');
        var span = document.createElement('span');
        span.innerHTML = toggle;
        td_title.appendChild(span);
        if (colour_cb) {
            var picker = new Huebee(span, {
                setText    : false,
                setBGColor : false,
                saturations: 1
            });
            picker.on('change', function(colour) {
                td_title.style.color = colour;
                picker.close();
                return colour_cb(toggle, colour);
            });
        }
        tr.appendChild(td_title);

        var td_toggle = document.createElement('td');
        // td_toggle.style.width = '60px';
        tr.appendChild(td_toggle);

        var checkbox = document.createElement('input');
        checkbox.type    = 'checkbox';
        checkbox.checked = default_en;
        td_toggle.appendChild(checkbox);
        $(checkbox).bootstrapToggle({
            on: 'Show', off: 'Hide', onstyle: 'success', size: 'small'
        });
        td_toggle.onchange = (function(_id, _checkbox) {
            return function() { callback(_id, _checkbox.checked); };
        })(toggle, checkbox);
    });

    return table;
};

// @function createAttributesTable
// Draw a table of attributes and values (arbitrary number of columns)
//
UI.createAttributesTable = function(headings, rows) {
    var table = document.createElement('table');
    table.setAttribute('class', 'table attribute-table');

    var thead       = document.createElement('thead');
    var tr_headings = document.createElement('tr');
    headings.forEach(function(heading) {
        var th = document.createElement('th');
        th.innerHTML = heading;
        tr_headings.appendChild(th);
    });
    thead.appendChild(tr_headings);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    rows.forEach(function(row) {
        var tr = document.createElement('tr');
        row.forEach(function(col) {
            var td = document.createElement('td');
            td.innerHTML = col;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    return table;
};

// @function showSidebar
// Show or hide the sidebar
//
UI.showSidebar = function(show) {
    var sidebar   = document.getElementsByClassName('sidebar')[0];
    var dashboard = document.getElementsByClassName('dashboard')[0];
    if (show) {
        sidebar.setAttribute('class',   sidebar.getAttribute('class').replace('collapsed',''));
        dashboard.setAttribute('class', dashboard.getAttribute('class').replace('expanded',''));
    } else {
        sidebar.setAttribute('class',   sidebar.getAttribute('class')+' collapsed');
        dashboard.setAttribute('class', dashboard.getAttribute('class')+' expanded');
    }
    // UI.autoresize();
};

// @function zoomIn
// Call the canvas method to zoom in on the design
//
UI.zoomIn = function() { UI.diagram.canvas.zoom(1); };

// @function zoomOut
// Call the canvas method to zoom out from the design
//
UI.zoomOut = function() { UI.diagram.canvas.zoom(-1); };

// @function zoomReset
// Call the canvas method to reset the zoom on the design
//
UI.zoomReset = function() { UI.diagram.canvas.zoom(0); };

// @function clearConnections
// Clean up all drawn connections
//
UI.clearConnections = function() {
    Object.values(UI.connections).forEach(function(conns) {
        conns.forEach(function(conn) {
            conn.setVisible(false);
        });
    });
    UI.diagram.route();
    UI.diagram.render();
};
