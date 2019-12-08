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

Diagram.InspectorElement = function(type, attributes, content) {

    var _this = this;

    _this.type       = type;
    _this.content    = (typeof(content) == string) ? content : [];
    _this.attributes = attributes || {};

    _this.element    = document.createElement(_this.type);

    _this.render = function() {
        // Clear out any previous render
        _this.element.innerHTML = '';

        // Setup all attributes
        Object.keys(_this.attributes).forEach(function(attr) {
            _this.element.setAttribute(attr, _this.attributes[attr]);
        });

        // Append all child elements
        if (typeof(_this.content) == 'string') {
            _this.element.innerHTML = _this.content;
        } else {
            _this.content.forEach(function(el) {
                _this.element.appendChild(el);
            });
        }

        return _this.element;
    };

    _this.addChild = function(el) {
        if (typeof(_this.content) == 'string') {
            _this.content = [
                new Diagram.InspectorElement('span', _this.content)
            ];
        }
        _this.content.push(el);
    };

};

Diagram.InspectorTable = function() {

    var _this = this;

    _this.root     = new Diagram.InspectorElement(
        'table',
        { 'class': 'table table-bordered table-striped table-sm' }
    );

    _this.head     = new Diagram.InspectorElement('thead');
    _this.head_row = new Diagram.InspectorElement('tr');
    _this.head.addChild(_this.head_row);
    _this.root.addChild(_this.head);

    _this.body     = new Diagram.InspectorTable('tbody');
    _this.root.addChild(_this.body);

    _this.addColumn = function(title) {
        _this.columns.push(new InspectorElement('th', {}, title));
    };

    _this.addRow = function(elements) {
        var row = new InspectorElement('tr');
        elements.forEach(function(el) {
            row.addChild(new InspectorElement('td', {}, el));
        });
        _this.body.addChild(row);
    };

    _this.render = function() {
        return _this.body.render();
    };

};

Diagram.ModuleInspector = function(module) {

    var _this = this;

    _this.module = module;

    _this.render = function() {
        var to_render = [];

        to_render.push(new Diagram.InspectorElement('h5', {}, _this.module.name));
        to_render.push(new Diagram.InspectorElement('h4', {}, 'Block Information'));
        var blk_info_table = new Diagram.InspectorTable();
        blk_info_table.addColumn('Property');
        blk_info_table.addColumn('Value');
        blk_info_table.addRow(['Type', 'sts']);
        blk_info_table.addRow(['Repository', 'sts_fe']);
        to_render.push(blk_info_table);
        to_render.push(new Diagram.InspectorElement('h4', {}, 'Registers'));
        to_render.push(new Diagram.InspectorElement('h4', {}, 'Ports'));
        to_render.push(new Diagram.InspectorElement('h4', {}, 'Children'));
        to_render.push(new Diagram.InspectorElement('h4', {}, 'Top Level Connections'));

        return to_render;
    };

};

Diagram.PortInspector = function(port) {

    var _this = this;

    _this.port = port;

};

Diagram.Inspector = function(canvas, id) {

    var _this = this;

    _this.canvas  = canvas;
    _this.id      = id;
    _this.element = document.getElementById(_this.id);

    _this.render = function(inspector) {
        _this.reset();

        var to_render = inspector.render();
        to_render.forEach(function(item) {
            _this.addElement(item);
        });
    };

    _this.addElement = function(el) {
        _this.element.appendChild(el);
    };

    _this.reset = function() {
        _this.element.innerHTML = '';
    };

};
