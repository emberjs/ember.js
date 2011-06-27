/*globals QUnit spade */

require('jquery');
var qunit = require('./qunit');

var packageName = location.search.match(/package=([^&]+)&?/);
packageName = packageName && packageName[1];

var prefix = location.search.match(/prefix=([^&]+)&?/);
prefix = prefix && prefix[1];

if (!packageName) {
  $('#qunit-header').text('Pass package=foo on URL to test package');
} else {
  require(packageName);
  $.extend(window, qunit);

  QUnit.config.autostart = false;
  QUnit.onload();
  $('h1 > a').text(packageName);

  QUnit.jsDump.setParser('object', function(obj) {
    return obj.toString();
  });

  var runtime = spade["package"](packageName);
  var files = runtime.files, file;

  for(var i=0, l=files.length; i<l; i++) {
    file = files[i];

    if (file.match(/tests\/.*\.js$/)) {
      if (!prefix || file.indexOf('tests/'+prefix)===0) {
        require(packageName+"/~" + file);
      }
    }
  }

}


