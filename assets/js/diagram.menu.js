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

Diagram.MenuItem = function(label, callback, menu) {

    var _this = this;

    _this.label    = label;
    _this.callback = callback;
    _this.menu     = menu;

    _this.render = function() {
        var li = document.createElement('li');
        li.innerHTML = _this.label;
        li.onclick   = (function(menu_item) {
            return function() {
                menu_item.menu.hideMenu();
                menu_item.callback();
            };
        })(_this);
        return li;
    };

};

Diagram.Menu = function(canvas) {

    var _this = this;

    // Reference to diagram
    _this.canvas  = canvas;

    // DOM Elements
    _this.root_div = document.createElement('div');
    _this.root_div.setAttribute('class', 'diagrammenu');
    _this.menu_ul = document.createElement('ul');
    _this.root_div.appendChild(_this.menu_ul);
    document.body.appendChild(_this.root_div);

    // Menu State
    _this.menu_items = [];
    _this.visible  = false;

    _this.displayMenu = function(x, y) {
        // Check if we have anything to show?
        if (_this.menu_items.length == 0) {
            _this.hideMenu();
            return;
        }

        // Render the menu
        _this.render();

        // Now display the menu
        _this.root_div.style.display = 'block';
        _this.root_div.style.top     = y + 'px';
        _this.root_div.style.left    = x + 'px';

        // Mark as visible
        _this.visible = true;
    };

    _this.hideMenu = function() {
        _this.root_div.style.display = 'none';
        _this.visible = false;
    };

    _this.isDisplayed = function() {
        return _this.visible;
    };

    _this.addItem = function(label, callback) {
        var item = new Diagram.MenuItem(label, callback, _this);
        _this.menu_items.push(item);
    };

    _this.clearMenu = function() {
        _this.menu_items = [];
    };

    _this.render = function() {
        _this.menu_ul.innerHTML = '';
        _this.menu_items.forEach(function(item) {
            var dom_li = item.render();
            _this.menu_ul.appendChild(dom_li);
        });
    };

};
