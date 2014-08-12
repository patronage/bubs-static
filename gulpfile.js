'use strict';

// load plugins
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

var fs = require('fs');
var rimraf = require('rimraf');
var merge = require('merge-stream');
var runSequence = require('run-sequence');

// gulp config
var config = {
    assets: 'assets',
    templates: 'templates',
    output: 'public',
    static: 'public/static'
};

// in production tasks, we set this to true
var isProduction = false;

gulp.task('styles', function() {
    return gulp.src( config.assets + '/scss/**/*.scss' )
        .pipe($.sass({
            style: 'compressed',
            onError: function(err){
                $.notify().write(err);
            }
        }))
        .pipe($.autoprefixer('last 2 versions'))
        .pipe(gulp.dest( config.output + '/css' ))
});

// Optimize Images
// NOTE: if you're on OSX and have any issues, run this in terminal:
// `ulimit -S -n 2048`
gulp.task('imagemin', function () {
    return gulp.src(config.assets + '/img/**/*')
        .pipe($.cache($.imagemin({
            progressive: true,
            interlaced: true
        })))
    // rewrite images in place
    .pipe(gulp.dest(config.assets + '/img'))
    .pipe($.size({title: 'images'}))
});

//
gulp.task('copy', function (cb) {
    var images = gulp.src(config.assets + '/img/**/*')
        .pipe(gulp.dest(config.output + '/img/'));

    var scripts = gulp.src(config.assets + '/js/**/*')
        .pipe(gulp.dest(config.output + '/js/'));

    if (isProduction) {
        return merge(images);
    } else {
        return merge(images, scripts);
    }
});

// Static Site

gulp.task('templates', function (cb) {
    // swig config

    var opts = {
        data: {
            headline: "Welcome"
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

// dev JS will load the original scripts as specified in useref blog
// production will minify and strip console.logs
gulp.task('scripts', function() {
    return gulp.src( config.templates + '/layouts/_base.swig' )
        .pipe($.useref.assets({searchPath: '{assets,public}'}))
        .pipe($.stripDebug())
        .pipe($.uglify())
        .pipe(gulp.dest( config.output ));
});

// loops through the generated html and replaces all references to static versions
gulp.task('rev', function (cb) {
    return gulp.src( config.output + '/{css,img,js}/**/*' )
        .pipe($.rev())
        .pipe(gulp.dest( config.static ))
        .pipe($.rev.manifest())
        .pipe(gulp.dest( config.static ))
});

// local webserver

gulp.task('connect', function () {
    $.connect.server({
        root: [config.output],
        port: 9000,
        livereload: true
    });
});

// clean output directory
gulp.task('clean', function (cb) {
    rimraf(config.output, cb);
});

// watch and live reload
gulp.task('watch', function() {
    $.livereload.listen();

    gulp.watch( config.output + '/**/*').on('change', $.livereload.changed);

    gulp.watch( config.assets + '/**/*.js', ['scripts']);
    gulp.watch( config.assets + '/scss/**/*.scss', ['styles']);
    gulp.watch( config.templates + '/**/*.swig', ['templates']);

    // note: this task will run twice as the image is saved in place kicking another watch event
    gulp.watch( config.assets + '/img/**/*', ['imagemin']);

});

// build production files
gulp.task('release', function (cb) {
    isProduction = true;
    runSequence('clean', ['copy', 'styles', 'scripts'], ['rev'], ['templates'], cb);
});

// local dev task
gulp.task('default', function (cb) {
    runSequence('clean', ['copy', 'styles'], ['templates'], ['watch', 'connect'], cb);
});
