var gulp = require("gulp");
var gutil = require("gulp-util");

var react = require("gulp-react");
var coffee = require("gulp-coffee");
var less = require("gulp-less");
var imagemin = require("gulp-imagemin");

var rjs = require("gulp-requirejs");
var uglify = require("gulp-uglify");
var prefix = require("gulp-autoprefixer");

var minifyHTML = require("gulp-minify-html");
var minifyCSS = require("gulp-minify-css");

const SRC = "www";
const BUILD = "build";

const HTTP_PORT = 8000;

var paths = {
  bower: [
    SRC + "/bower_components/**/*.js",
    SRC + "/bower_components/**/*.css",
    SRC + "/bower_components/**/*.otf",
    SRC + "/bower_components/**/*.eot",
    SRC + "/bower_components/**/*.svg",
    SRC + "/bower_components/**/*.ttf",
    SRC + "/bower_components/**/*.woff",
  ],

  js: SRC + "/js/src/**/*.js",
  jsx: SRC + "/js/src/**/*.jsx",
  coffee: SRC + "/js/src/**/*.coffee",
  requireConfig: SRC + "/js/src/require-config.js",

  less: SRC + "/css/src/**/*.less",
  css: SRC + "/css/build/**/*.css",

  images: SRC + "/img/*",
  fonts: SRC + "/fonts/*",

  index: SRC + "/index.html",

  spec: SRC + "/spec/*.coffee",
};

gulp.task("bower", function () {
  return gulp.src(paths.bower).pipe(gulp.dest(BUILD + "/bower_components"));
});

gulp.task("js", function () {
  return gulp.src(paths.js).pipe(gulp.dest(SRC + "/js/build"));
});

gulp.task("jsx", function () {
  return gulp
    .src(paths.jsx)
    .pipe(react())
    .pipe(gulp.dest(SRC + "/js/build"));
});

gulp.task("coffee", function () {
  return gulp
    .src(paths.coffee)
    .pipe(coffee())
    .pipe(gulp.dest(SRC + "/js/build"));
});

gulp.task("less", function () {
  return gulp
    .src(paths.less)
    .pipe(less())
    .pipe(prefix("last 1 version", "> 1%", "ie 8", "ie 7"))
    .pipe(gulp.dest(SRC + "/css/build"));
});

gulp.task("images", function () {
  return gulp
    .src(paths.images)
    .pipe(imagemin({ optimizationLevel: 5 }))
    .pipe(gulp.dest(BUILD + "/img"));
});

gulp.task("fonts", function () {
  return gulp.src(paths.fonts).pipe(gulp.dest(BUILD + "/fonts"));
});

gulp.task("compile", ["js", "jsx", "coffee", "less", "images", "fonts"]);

// Rerun the task when a file changes
gulp.task("watch", ["compile"], function () {
  gulp.watch(paths.js, ["js"]);
  gulp.watch(paths.jsx, ["jsx"]);
  gulp.watch(paths.coffee, ["coffee"]);
  gulp.watch(paths.less, ["less"]);
  //gulp.watch(paths.images, ['images']);
  //gulp.watch(paths.spec, ['spec']);
});

gulp.task("index", function () {
  return gulp.src(paths.index).pipe(minifyHTML()).pipe(gulp.dest(BUILD));
});

gulp.task("css", function () {
  return gulp
    .src(paths.css)
    .pipe(minifyCSS())
    .pipe(gulp.dest(BUILD + "/css/build"));
});

gulp.task("rjs", ["compile"], function () {
  return rjs({
    baseUrl: SRC + "/js/build",
    paths: {
      bootstrap: "../../bower_components/bootstrap/dist/js/bootstrap",
      director: "../../bower_components/director/build/director",
      fastclick: "../../bower_components/fastclick/lib/fastclick",
      react: "../../bower_components/react/react-with-addons",
      underscore: "../../bower_components/underscore/underscore",
      less: "../../bower_components/less/dist/less-1.7.0",
    },
    shim: {
      director: {
        exports: "Router",
      },
      fastclick: {
        exports: "FastClick",
      },
      react: {
        exports: "React",
      },
      underscore: {
        exports: "_",
      },
    },
    name: "view/run",
    out: "main.js",
  })
    .pipe(uglify())
    .pipe(gulp.dest(BUILD + "/js/build"));
});

gulp.task("requireConfig", function () {
  return gulp
    .src(paths.requireConfig)
    .pipe(uglify())
    .pipe(gulp.dest(BUILD + "/js/build"));
});

gulp.task("copy", ["bower", "index", "css", "requireConfig"]);

gulp.task("build", ["copy", "rjs"]);

function server(root) {
  require("http")
    .createServer(require("ecstatic")({ root: root }))
    .listen(HTTP_PORT);

  gutil.log("Serving files at http://localhost:" + HTTP_PORT);
}

gulp.task("http", function () {
  server(SRC);
});

gulp.task("http-www", function () {
  server(BUILD);
});

gulp.task("development", ["watch", "http"]);

gulp.task("default", ["development"]);
