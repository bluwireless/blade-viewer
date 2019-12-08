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

const FS    = require('fs');
const JSZip = require('jszip');
const Path  = require('path');

module.exports = function(app) {

    var stream_zipped_design = function(req, res, next, path) {
        console.log('Returning design from path: %s', path);
        if (!FS.existsSync(path)) {
            return next(new Error('Design does not exist'));
        } else {
            var data = FS.readFile(path, function(err, data) {
                if (err) return next(err);

                var zip = new JSZip();
                zip.file('elaborated.json', data);
                res.setHeader('Content-Type', 'application/x-zip-compressed');
                zip.generateNodeStream({
                    compression       : 'DEFLATE',
                    compressionOptions: { level: 9 }
                }).pipe(res);

            });
        }
    };

    app.get('/view/path/*/design', function(req, res, next) {
        var abs_path = req.path.replace(/^\/view\/path\//i, '').replace(/\/design$/, '');
        return stream_zipped_design(req, res, next, abs_path);
    });

    app.get('/view/path/*', function(req, res, next) {
        return res.render(
            'view', { title: 'Viewer' }
        );
    });

};
