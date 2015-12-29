// load node modules
var del = require('del');
var fs = require('fs');

// load static site helpers
var yaml = require('js-yaml');
var fm = require('front-matter');
var marked = require('swig-marked');
var extras = require('swig-extras');

module.exports = function (gulp, $, isProduction, config) {
    return function () {
        var home = yaml.safeLoad(fs.readFileSync('./templates/data/home.yml', 'utf8'));

        // swig config
        var opts = {
            data: {
                some_string: "",
                home: home,
            },
            defaults: {
                cache: false,
                locals: {
                    environment: 'development',
                    now: function () { return new Date(); }
                }
            },
            setup: function(swig) {}
        };

        // set production variable
        if ( isProduction ) {
            opts.defaults.locals.environment = 'production';
        }

        // set asset handling if manifest file exists
        var manifestPath = './public/static/rev-manifest.json';
        if (fs.existsSync(manifestPath)) {
            var manifest = require(manifestPath);
            opts.defaults.locals.rev = function(path) {
                return '/static/' + manifest[path];
            }
        } else {
            opts.defaults.locals.rev = function(path) {
                return '/' + path;
            }
        }

        gulp.src( config.templates + '/*.swig')
            .pipe($.swig(opts))
            .pipe(gulp.dest( config.output ));
    };
};
