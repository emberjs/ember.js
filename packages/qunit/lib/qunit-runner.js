/*globals QUnit spade */

require('jquery');
var qunit = require('./qunit');

var packageName = location.search.match(/package=([^&]+)&?/)[1];

if (!packageName) {
  $('#qunit-header').text('Pass package=foo on URL to test package');
} else {
  require(packageName);
  $.extend(window, qunit);

  QUnit.onload();

  QUnit.jsDump.setParser('object', function(obj) {
    return obj.toString();
  });

  var runtime = spade["package"](packageName);
  var files = runtime.files, file;

  for(var i=0, l=files.length; i<l; i++) {
    file = files[i];

    if (file.match(/tests\/.*\.js$/)) {
      require(packageName+"/~" + file);
    }
  }

  QUnit.start();
}


