var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var ngAnnotate = require('gulp-ng-annotate');
var clean = require('gulp-clean');
var path = require('path');
var plumber = require('gulp-plumber');
var eventStream = require('event-stream');

// Root directory
var rootDirectory = path.resolve('./');

// Source directory for build process
var sourceDirectory = path.join(rootDirectory, './src');

var sourceFiles = [
  path.join(sourceDirectory, '/**/*.js'),
  path.join(rootDirectory, '/*footer.*')
];

// Build JavaScript distribution files
gulp.task('build', ['clean'], function() {
  return eventStream.merge(gulp.src(sourceFiles))
    .pipe(plumber())
    .pipe(concat('angular-actioncable.js'))
    .pipe(gulp.dest('./dist/'))
    .pipe(ngAnnotate())
    .pipe(uglify({mangle: false}))
    .pipe(rename('angular-actioncable.min.js'))
    .pipe(gulp.dest('./dist/'));
});

// removes the dist folder
gulp.task('clean', function () {
  return gulp.src('dist', {read: false})
    .pipe(clean());
});
