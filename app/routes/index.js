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

const FS   = require('fs');
const Path = require('path');

module.exports = function(app) {
    // Find all '.js' files in this directory
    var files = FS.readdirSync(__dirname)
                  .filter(function(f) {
                      return (
                          (Path.extname(f).trim().toLowerCase()       == '.js') &&
                          (f.trim().toLowerCase().indexOf('index.js') <  0    )
                      )
                  });

    // Find all subfolders of this directory containing a 'index.js' file
    var folders = FS.readdirSync(__dirname)
                    .filter(function(f) {
                        var f_path = Path.join(__dirname, f);
                        return (
                            FS.statSync(f_path).isDirectory() &&
                            FS.existsSync(Path.join(f_path, 'index.js'))
                        );
                    });

    // Ask all files to register their routes
    files.forEach(function(file) {
        require(Path.join(__dirname, file))(app);
    });

    // Ask all subfolders to register their routes
    folders.forEach(function(folder) {
        require(Path.join(__dirname, folder))(app);
    });
};
