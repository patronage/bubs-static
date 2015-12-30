// load node modules
var del = require('del');
var fs = require('fs');

// load static site helpers
var yaml = require('js-yaml');
var fm = require('front-matter');
var marked = require('swig-marked');
var extras = require('swig-extras');

var nunjucksModule = require('nunjucks');
var dateFilter = require('nunjucks-date-filter');

module.exports = function (gulp, $, isProduction, config) {

    var home = yaml.safeLoad(fs.readFileSync('./templates/data/home.yml', 'utf8'));

    var data = {
        test_string: "foo bar",
        now: Date.now(),
        home: home,
    };

    // Customize Nunjucks
    var nunjucksEnv = new nunjucksModule.Environment([
        new nunjucksModule.FileSystemLoader('templates')
    ]);
    nunjucksEnv.addFilter('date', dateFilter);

    // set environment variable
    if ( isProduction ) {
        nunjucksEnv.addGlobal("environment", "production");
    } else {
        nunjucksEnv.addGlobal("environment", "development");
    }

    // set asset handling if manifest file exists
    var manifestPath = './public/static/rev-manifest.json';
    if (fs.existsSync(manifestPath)) {
        var manifest = require(manifestPath);
        nunjucksEnv.addGlobal('rev', path => '/static/' + manifest[path]);
    } else {
        nunjucksEnv.addGlobal('rev', path => '/' + path);
    }

    return function () {
        gulp.src( config.templates + '/*.html')
            .pipe($.nunjucks.compile(data, {
                env: nunjucksEnv,
                noCache: true
            }))
            .pipe(gulp.dest( config.output ));
    };
};
