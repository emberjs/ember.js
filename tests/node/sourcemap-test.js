var fs = require('fs');

QUnit.module('sourcemap validation', function() {
  QUnit.test(`ember.js has only a single sourcemaps comment`, function(assert) {
    var jsPath = `dist/ember.js`;
    assert.ok(fs.existsSync(jsPath));

    var contents = fs.readFileSync(jsPath, 'utf-8');
    var num = count(contents, '//# sourceMappingURL=');
    assert.equal(num, 1);
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
