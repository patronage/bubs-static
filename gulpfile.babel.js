'use strict';

// load gulp and gulp plugins
import gulp from 'gulp';
import plugins from 'gulp-load-plugins';
const $ = plugins();

// load node modules
import del from 'del';
import { exec } from 'child_process';

// others
import browserSync from 'browser-sync';

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

const config = {
  assets: 'src',
  templates: 'src/site',
  output: 'dist',
  static: 'public/static'
};

// in production tasks, we set this to true
let isProduction = false;

// Error Handling

export function handleErrors() {
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

export function styles() {
  var sassOptions = {
      outputStyle: 'expanded'
  };

  var sourcemapsOptions = {
      debug: false
  }

  return gulp.src( config.assets + '/scss/*.scss')
      .pipe($.sourcemaps.init())
      .pipe($.sass(sassOptions).on('error', handleErrors))
      .pipe($.autoprefixer('last 2 versions'))
      .pipe($.sourcemaps.write(sourcemapsOptions))
      .pipe($.if(isProduction, $.csso()))
      .pipe(gulp.dest( config.output + '/css' ))
      .pipe(browserSync.stream());
}

export function scripts() {
  return gulp.src( config.assets + "/js/**/*.js")
      .pipe($.concat('main.js'))
      .pipe($.uglify())
      .pipe($.if(isProduction, $.stripDebug()))
      .pipe(gulp.dest( config.output + '/js'));
}

export const clean = () => del([config.output]);

// cleanup final markup
export function prettify(done) {
  gulp.src( config.output + '/**/*.html')
      .pipe($.prettify({indent_size: 4}))
      .pipe(gulp.dest( config.output ));
  done();
}

//run eleventy shell command to generate files
export function generate(cb) {
  exec('eleventy', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}

// local webserver
export function serve(done) {
  browserSync.init({
      server: {
          baseDir: "./dist"
      },
      open: localConfig.bs.open,
      tunnel: localConfig.bs.tunnel,
      logLevel: localConfig.bs.logLevel
  });
  done();
}

export function reload(done) {
  browserSync.reload();
  done();
}

export function watch() {
  gulp.watch(config.templates + '/**/*.{md,njk,json}', gulp.series('generate', 'reload'));
  gulp.watch(config.assets + '/scss/**/*.scss', gulp.parallel('styles'));
  gulp.watch(config.assets + '/js/**/*.js', gulp.parallel('scripts', 'reload'));
  //gulp.watch([config.assets + '/{img,fonts,js}/**'], ['copy', browserSync.reload]);
  //gulp.watch( config.templates + '/**/*.{swig,md,yml}', ['templates', browserSync.reload]);
}

export function production(done) {
    isProduction = true;
    done();
}

//
// Multi-step tasks
//

// build production files
gulp.task('release', gulp.series(production, clean, styles, scripts, generate, prettify));

// local dev task
gulp.task('default', gulp.series(clean, styles, scripts, generate, serve, watch));