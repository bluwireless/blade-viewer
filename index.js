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

// -----------------------------------------------------------------------------
// Import library dependencies
// -----------------------------------------------------------------------------

const BodyParser = require('body-parser');
const Config     = require('./config');
const Express    = require('express');
const FS         = require('fs');
const Handlebars = require('express-handlebars');
const Path       = require('path');

// Pickup arguments passed in
const Argv       = require('minimist')(process.argv.slice(2));

// Expose the application root directory
global.app_root = __dirname;
global.df_dir   = Path.join(global.app_root, 'designformat', 'javascript');

// -----------------------------------------------------------------------------
// Construct the basic Express app
// -----------------------------------------------------------------------------
const app = Express();

// Setup body parser to handle post data
app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

// Setup UI router to use Handlebars for rendering
app.set('views', Path.join(__dirname, 'app/routes/ui/views'));
app.engine('handlebars', Handlebars({
    defaultLayout: 'main',
    layoutsDir   : Path.join(__dirname, 'app/routes/ui/views/layouts'),
    partialsDir  : Path.join(__dirname, 'app/routes/ui/views/partials'),
    helpers      : {
        block     : function(name) {
            var blocks  = this._blocks,
                content = blocks && blocks[name];

            return content ? content.join('\n') : null;
        },
        contentFor: function(name, options) {
            var blocks = this._blocks || (this._blocks = {});
                block = blocks[name] || (blocks[name] = []);
            block.push(options.fn(this));
        }
    }
}));
app.set('view engine', 'handlebars');

// -----------------------------------------------------------------------------
// Register any routes
// -----------------------------------------------------------------------------
require('./app/routes')(app);
app.get('/assets/js/designformat/designformat.js', (req, res, next) => {
    let base_path = global.df_dir;
    FS.readdir(base_path, (err, files) => {
        if (err) return next(err);
        let df_files = files.filter((file) => {
            return (
                file.indexOf('.js')          >= 0 && // Only capture JS files
                file.indexOf('project.js')    < 0 && // Place project.js and..
                file.indexOf('df_models.js')  < 0 && // ...df_models.js last
                file.indexOf('base.js')       < 0    // Place base.js first
            );
        });
        let content = '';
        content += FS.readFileSync(Path.join(base_path, 'base.js'), { encoding: 'utf-8' });
        for (let file of df_files) {
            content += FS.readFileSync(Path.join(base_path, file), { encoding: 'utf-8' });
        }
        content += FS.readFileSync(Path.join(base_path, 'project.js'), { encoding: 'utf-8' });
        content += FS.readFileSync(Path.join(base_path, 'designformat.js'), { encoding: 'utf-8' });
        res.setHeader('Content-Type', 'application/javascript');
        res.send(content);
    });
});
app.use('/assets/js/designformat', Express.static(global.df_dir));
app.use('/assets', Express.static('./assets'));

// -----------------------------------------------------------------------------
// Expose the Express port
// -----------------------------------------------------------------------------
app.listen(Config.http.port || 8080, function() {
    console.log('[EXPRESS] App running on port ' + Config.http.port);
});
