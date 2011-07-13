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
  packageName = decodeURIComponent(packageName);
  var packages = packageName.split(','), runtime, files, file, i, j, l, len;

  for(i=0, l=packages.length; i<l; i++) {
    require(packages[i]);
  }

  $.extend(window, qunit);

  QUnit.config.autostart = false;
  QUnit.config.autorun = false;

  $('h1 > a').text(packageName);

  QUnit.jsDump.setParser('object', function(obj) {
    return obj.toString();
  });

  for (i=0, l=packages.length; i<l; i++) {
    runtime = spade["package"](packages[i]);
    files = runtime.files;

    for(j=0, len=files.length; j<len; j++) {
      file = files[j];

      if (file.match(/tests\/.*\.js$/)) {
        if (!prefix || file.indexOf('tests/'+prefix)===0) {
          require(packages[i]+"/~" + file);
        }
      }
    }
  }

  QUnit.onload();
  QUnit.start();

}


