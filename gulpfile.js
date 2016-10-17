var gulp = require('gulp');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var merge = require('merge-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var babel = require('babelify');
var ignore = require('gulp-ignore');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var ngAnnotate = require('gulp-ng-annotate');

var browserifyOptions = {
  debug: true
};

var babelOptions = {
  "presets": ['es2015', 'es2016']
}

gulp.task('build', function() {
  var sourceStream = browserify('./src/ngActionCable.js', browserifyOptions)
    .transform(babel, babelOptions)
    .bundle()
    .on('error', function(err) { console.error(err); this.emit('end'); })
    // .pipe(ngAnnotate())
    .pipe(source('angular-actioncable.js'))
    .pipe(ngAnnotate())
    .pipe(buffer());

  // var mapStream = sourceStream
  //   .pipe(sourcemaps.init({ loadMaps: true }))
  //   .pipe(sourcemaps.write('.'))
  //   .pipe(gulp.dest('./dist'));

  var jsStream = sourceStream
    .pipe(ignore.exclude([ "**/*.map" ]))
    // .pipe(uglify())
    // .pipe(rename('angular-actioncable.min.js'))
    .pipe(gulp.dest('./dist'));
  return jsStream;
  // return merge([jsMinStream]);
});
