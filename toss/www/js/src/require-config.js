define(function () {
  require.config({
    baseUrl: "js/build",
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
  });

  require(["main"], function () {
    require(["view/run"]);
  });
});
