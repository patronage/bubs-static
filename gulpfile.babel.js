'use strict';

// load gulp and gulp plugins
import gulp from 'gulp';
import plugins from 'gulp-load-plugins';
const $ = plugins();

// load node modules
import del from 'del';
import { exec } from 'child_process';
import pump from 'pump';
import beeper from 'beeper';

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
      },
      imgWidths: [400,1000],
      doResize: true
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

// debug Eleventy
let isDebug = false;

// Error Handling

var handleErrors = err => {
    // special variables for uglify
    if ( err.cause ){
        err.message = err.cause.message;
        err.line = err.cause.line;
        err.column = err.cause.col;
    }

    // notifications
    if (err.line && err.column) {
        var notifyMessage = 'LINE ' + err.line + ':' + err.column + ' -- ';
    } else {
        var notifyMessage = '';
    }

    $.notify({
        title: 'FAIL: ' + err.plugin,
        message: notifyMessage + err.message,
    }).write(err);

    beeper(); // System beep

    // Tell Travis to FAIL
    if ( isProduction ) {
        process.exit(1);
    }
};

//
// Gulp Tasks
//

export function styles(cb) {
  var sassOptions = {
      outputStyle: 'expanded'
  };

  var sourcemapsOptions = {
      debug: false
  }
      pump([ gulp.src( config.assets + '/scss/*.scss'),
      $.sourcemaps.init(),
      $.sass(sassOptions),
      $.autoprefixer('last 2 versions'),
      $.sourcemaps.write(sourcemapsOptions),
      $.if(isProduction, $.csso()),
      gulp.dest( config.output + '/css' ),
      browserSync.stream()
    ], err => {
        if (err) {
          handleErrors(err);  
          return cb();
        } else {
          return cb();
        }
      });
}

export function scripts(cb) {

    const renameOptions = path => {
      if (path.dirname.includes('node_modules')) {
        path.dirname = path.dirname.replace('node_modules', 'layouts/js/vendor');
      }
      path.dirname = config.templates + path.dirname;
    }
    
    var uglifyOptions = {
      mangle: false,
      compress: {
        //drop_console: true
      }
    };
    
    pump([ gulp.src( config.templates + '/_includes/layouts/base.njk' ),
        $.useref({ searchPath: [config.assets, '../node_modules'], noconcat: true, transformPath: function(filePath) {
          return filePath.replace('/js/vendor','../node_modules')
      }}),
        $.rename(renameOptions),
        $.if('*.js', $.uglify(uglifyOptions)),
        $.if('*.js', $.babel({
            presets: ['@babel/env']
        })),
        $.if('*.js', gulp.dest( config.output ))
    ], err => {
        if (err) {
          handleErrors(err);
          return cb();
        } else {
          return cb();
        }
      });
    }

export function copy(cb) {
    pump([ gulp.src(config.assets + '/{img,fonts}/**/*', {base: config.assets}),
    $.newer(config.output),  
    gulp.dest(config.output)
    ], cb);
}

export function resize (cb) {
    if(localConfig.doResize) {
    localConfig.imgWidths.forEach(function(size) {
    pump([gulp.src(config.assets + '/img/*'),
        $.newer(config.output + '/img'),
        $.gm(gmfile => gmfile.resize(size)),
        $.rename(function (path) { path.basename += "-" + size; }),
        gulp.dest(config.output + '/img')
        ], cb);
    });
    } else {
        return cb();
    }
}

// cleanup final markup
export function prettify(cb) {
  pump([gulp.src( config.output + '/**/*.html'),
      $.prettify({indent_size: 4}),
      gulp.dest( config.output )
    ], cb);
}

//run eleventy shell command to generate files
export function generate(cb) {
    let runEleventy = 'eleventy';
    if (isDebug) {
      runEleventy = 'DEBUG=Eleventy* eleventy';
    }
    exec(runEleventy, function(err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      if(stderr && isProduction) {
          process.exit(1);
      }
      cb(err);
    });
  }

// local webserver
export function bs(done) {
  browserSync.init({
      server: {
          baseDir: "./dist"
      },
      notify: false,
      open: localConfig.bs.open || true,
      tunnel: localConfig.bs.tunnel || false,
      logLevel: localConfig.bs.logLevel || 'info'
  });
  done();
}

export function watch(done) {
  gulp.watch(config.templates + '/**/*.{md,njk,json}', gulp.series(generate, reload));
  gulp.watch(config.assets + '/scss/**/*.scss', styles);
  gulp.watch(config.assets + '/js/**/*.js', gulp.series(scripts, reload));
  gulp.watch(config.assets + '/{img,fonts}/**', gulp.series(resize, copy, reload));
  done();
}

export const clean = () => del([config.output]);

export const reload = done => {
    browserSync.reload();
    done();
}

export const release = done => {
    isProduction = true;
    compile();
    done();
}

export const debug = done => {
    isDebug = true;
    defaultTasks();
    done();
  }

const compile = gulp.series(clean, styles, scripts, resize, copy, generate, prettify)
const serve = gulp.series(compile, bs)
const defaultTasks = gulp.parallel(serve, watch)

export default defaultTasks