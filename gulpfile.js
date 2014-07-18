'use strict';

// load plugins
var gulp = require("gulp");
var $ = require('gulp-load-plugins')();

var fs = require('fs');
var args = require('yargs').argv;
var rimraf = require('rimraf');
var marked = require("swig-marked");
var runSequence = require('run-sequence');

// gulp config
var config = {
    assets: 'assets',
    templates: 'templates',
    output: 'public',
    static: 'public/static'
};

// per environment
var isProduction = args.type === 'production';

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
gulp.task('imagemin', function () {
    return gulp.src(config.assets + '/img/**/*')
        .pipe($.cache($.imagemin({
            progressive: true,
            interlaced: true
        })))
    // rewrite images in place
    .pipe(gulp.dest(config.assets + '/img'))
    .pipe($.size({title: 'images'}))
    // put into dev folder
    .pipe(gulp.dest( config.output ))
});

gulp.task('copy', function (cb) {
    return gulp.src(config.assets + '/{img,js}/**/*')
        .pipe(gulp.dest(config.output + '/'))
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
            }
        },
        setup: function(swig) {
            marked.useTag(swig, 'markdown');
        }
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

// process build blocks in markup, generate css/js
gulp.task('html', ['styles', 'copy'], function (cb) {
    var lazypipe = require('lazypipe');
    var cssChannel = lazypipe()
        .pipe($.csso);

    return gulp.src( config.templates + '/layouts/_base.swig' )
        .pipe($.useref.assets({searchPath: '{assets,public}'}))
        .pipe($.if('*.js', $.stripDebug()))
        .pipe($.if('*.js', $.uglify()))
        .pipe($.if('*.css', cssChannel()))
        .pipe(gulp.dest( config.output ))
});

// loops through the generated html and replaces all references to static versions
gulp.task('rev', function (cb) {
    return gulp.src( config.output + '/{css,img,js}/*' )
        .pipe($.rev())
        .pipe(gulp.dest( config.static ))
        .pipe($.rev.manifest())
        .pipe(gulp.dest( config.static ))
});


// dev and dist servers

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
gulp.task('build', function (cb) {
    runSequence('clean', 'html', 'rev', 'templates', cb);
});

// local dev task
gulp.task('default', function (cb) {
    runSequence('clean', ['styles', 'imagemin'], ['html', 'templates'], ['watch', 'connect'], cb);
});
