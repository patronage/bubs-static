'use strict';

// load gulp and gulp plugins
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();


// load node modules
var del = require('del');
var fs = require('fs');

// others
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var yaml = require('js-yaml');
var fm = require('front-matter');
var _ = require('lodash');
var marked = require('swig-marked');
var extras = require('swig-extras');



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

// in production tasks, we set this to true
var isProduction = false;

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
    var assets = $.useref.assets({
        searchPath: '{assets,public}'
    });

    return gulp.src( config.templates + '/layouts/_base.swig' )
        .pipe(assets)
        .pipe($.uglify())
        .pipe($.if(isProduction, $.stripDebug()))
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

// Static Site

gulp.task('templates', function (cb) {

    // load yaml files as global variables (also assign to opts.data in swig config)
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

    return gulp.src( config.templates + '/*.swig')
        .pipe($.swig(opts))
        .pipe(gulp.dest( config.output ))
});

// clean output directory
gulp.task('clean', function () {
    return del([
        config.output
    ]);
    console.log('foo');
});

// local webserver
gulp.task('browser-sync', function() {
    browserSync.init(null, {
        server: {
            baseDir: ["./public", "./templates"]
        },
        open: localConfig.bs.open,
        tunnel: localConfig.bs.tunnel,
        logLevel: localConfig.bs.logLevel
    });
});

gulp.task('watch', function() {
    gulp.watch([config.templates + '/**/*.{swig,html}'], browserSync.reload);
    gulp.watch([config.assets + '/scss/**/*.scss'], ['styles']);
    // gulp.watch([config.assets + '/js/**/*.js'], ['scripts', browserSync.reload]);
    gulp.watch([config.assets + '/{img,fonts,js}/**'], ['copy', browserSync.reload]);
    gulp.watch( config.templates + '/**/*.{swig,md,yml}', ['templates', browserSync.reload]);
});


gulp.task('prettify', function() {
    gulp.src( config.output + '/**/*.html')
        .pipe($.prettify({indent_size: 4}))
        .pipe(gulp.dest( config.output ));
});

// build production files
gulp.task('release', function (cb) {
    isProduction = true;
    runSequence('clean', ['copy', 'styles', 'scripts'], ['rev'], ['templates'], ['prettify'], cb);
});

// local dev task
gulp.task('default', function (cb) {
    runSequence('clean', ['copy', 'styles'], ['templates'], ['watch', 'browser-sync'], cb);
});
