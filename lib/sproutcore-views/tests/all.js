require("sproutcore-views");

var qunit = require("sproutcore-runtime/~tests/qunit");

SC.mixin(window, qunit);

QUnit.onload();

QUnit.jsDump.setParser('object', function(obj) {
  return obj.toString();
});

var runtime = spade["package"]('sproutcore-views');
var files = runtime.files, file;

for(var i=0, l=files.length; i<l; i++) {
  file = files[i];

  if (file.match(/tests\/.*\.js$/)) {
    require("sproutcore-views/~" + file);
  }
}

QUnit.start();

