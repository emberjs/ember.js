require("sproutcore-handlebars");

var qunit = require("sproutcore-handlebars/~tests/qunit");

SC.mixin(window, qunit);

QUnit.onload();

QUnit.jsDump.setParser('object', function(obj) {
  return obj.toString();
});

var runtime = spade["package"]('sproutcore-handlebars');
var files = runtime.files, file;

for(var i=0, l=files.length; i<l; i++) {
  file = files[i];

  if (file.match(/tests\/.*\.js$/)) {
    require("sproutcore-handlebars/~" + file);
  }
}

QUnit.start();

