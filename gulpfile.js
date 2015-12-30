'use strict';

// load gulp and gulp plugins
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

// load node modules
var del = require('del');
var fs = require('fs');

// others
var yaml = require('js-yaml');
var minimist = require('minimist');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');

var nunjucksModule = require('nunjucks');
var dateFilter = require('nunjucks-date-filter');

//
// Gulp config
//

// Set defaults, allow for overrides from a custom local config file

try {
    var localConfig = require('./gulpconfig.json');
} catch (err) {
    var localConfig = {
        bs: {
            logLevel: "info",
            tunnel: "",
            open: false
        }
    };
}

// Defaults

var config = {
    assets: 'assets',
    templates: 'templates',
    output: 'public',
    static: 'public/static'
};

// Set production or dev mode

var argv = require('minimist')(process.argv.slice(2));
Object.assign(config, argv);

if ( config._[0] == "release" ) {
    var isProduction = true;
} else {
    var isProduction = false;
}

// Error Handling

var handleErrors = function() {
    var args = Array.prototype.slice.call(arguments);

    $.notify.onError({
        title: 'Compile Error',
        message: '<%= error.message %>'
    }).apply(this, args);

    if ( isProduction ) {
        // Tell Travis to Stop Bro
        process.exit(1);
    }

    this.emit('end');
};

//
// Gulp Tasks
//

gulp.task('styles', function() {
    var sassOptions = {
        outputStyle: 'expanded'
    };

    var sourcemapsOptions = {
        debug: false
    }

    return gulp.src(config.assets + '/scss/*.scss')
        .pipe($.sourcemaps.init())
        .pipe($.sass(sassOptions).on('error', handleErrors))
        .pipe($.autoprefixer('last 2 versions'))
        .pipe($.sourcemaps.write(sourcemapsOptions))
        .pipe($.if(isProduction, $.csso()))
        .pipe(gulp.dest( config.output + '/css' ))
        .pipe(browserSync.stream());
});

gulp.task('scripts', function() {
    var userefOpts = {
        searchPath: './assets'
    };

    return gulp.src( config.templates + '/layouts/_base.html' )
        .pipe($.useref(userefOpts))
        // .pipe($.uglify().on('error', handleErrors))
        // .pipe($.if(isProduction, $.stripDebug()))
        .pipe(gulp.dest( config.output ));
});

// copy unmodified files
gulp.task('copy', function (cb) {
    return gulp.src( config.assets + '/{img,fonts}/**/*', {base: config.assets})
        .pipe($.changed( config.output ))
        .pipe(gulp.dest( config.output ));
});

// loops through the generated html and replaces all references to static versions
gulp.task('rev', function (cb) {
    return gulp.src( config.output + '/{css,js,fonts,img}/*' )
        .pipe($.rev())
        .pipe($.revCssUrl())
        .pipe(gulp.dest( config.static ))
        .pipe($.rev.manifest())
        .pipe(gulp.dest( config.static ))
});

gulp.task('staticsite', function (cb) {

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

    return gulp.src( config.templates + '/**/*.html')
    // todo, filter out files that start with a `_`
        .pipe($.nunjucks.compile(data, {
            env: nunjucksEnv,
            // noCache: true
        }))
        .pipe(gulp.dest( config.output ));
});

// clean output directory
gulp.task('clean', function () {
    return del([
        config.output
    ]);
});

// cleanup final markup
// todo: bug currently in this, it's not finding the index.html file
gulp.task('prettify', function(cb) {
    gulp.src( config.output + '/*.html')
        .pipe($.debug({title: 'unicorn:'}))
        .pipe($.prettify({
            indent_size: 4,
            max_preserve_newlines: 1
        }))
        .pipe(gulp.dest( config.output ));
});

// local webserver
gulp.task('browser-sync', function() {
    browserSync.init(null, {
        server: {
            baseDir: ["./public", "./assets"]
        },
        open: localConfig.bs.open,
        tunnel: localConfig.bs.tunnel,
        logLevel: localConfig.bs.logLevel
    });
});

gulp.task('watch', function() {
    gulp.watch([config.assets + '/scss/**/*.scss'], ['styles']);
    // gulp.watch([config.assets + '/js/**/*.js'], ['scripts', browserSync.reload]);
    gulp.watch([config.assets + '/{img,fonts,js}/**'], ['copy', browserSync.reload]);
    gulp.watch([config.templates + '/**/*.{html,md,yml}'], ['staticsite', browserSync.reload]);
});

//
// Multi-step tasks
//

// build production files
gulp.task('release', function (cb) {
    runSequence('clean', ['copy', 'styles', 'scripts'], ['rev'], ['staticsite'], ['prettify'], cb);
});

// local dev task
gulp.task('default', function (cb) {
    runSequence('clean', ['copy', 'styles'], ['staticsite'], ['watch', 'browser-sync'], cb);
});
