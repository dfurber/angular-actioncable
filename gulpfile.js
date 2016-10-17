var gulp = require('gulp');
var concat = require('gulp-concat');

gulp.task('build', function() {
  var path = './src/*.js';
  gulp.src('./src/*.js')
    .pipe(concat('actionCable.js'))
    .pipe(gulp.dest('./dist'));

});
