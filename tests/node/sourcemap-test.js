var fs = require('fs');

QUnit.module('sourcemap validation', function() {
  var assets = ['ember.debug', 'ember.prod'];

  assets.forEach(asset => {
    QUnit.test(`${asset} has only a single sourcemaps comment`, function(assert) {
      var jsPath = `dist/${asset}.js`;
      assert.ok(fs.existsSync(jsPath));

      var contents = fs.readFileSync(jsPath, 'utf-8');
      var num = count(contents, '//# sourceMappingURL=');
      assert.equal(num, 1);
    });
  });
});

function count(source, find) {
  var num = 0;

  var i = -1;
  while ((i = source.indexOf(find, i + 1)) !== -1) {
    num += 1;
  }

  return num;
}
