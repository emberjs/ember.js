const validate = require('sourcemap-validator');
const fs = require('fs');

QUnit.module('sourcemap validation', function() {
  let assets = ['ember.debug', 'ember.prod', 'ember.min'];

  assets.forEach(asset => {
    QUnit.test(`${asset} has valid sourcemaps`, function(assert) {
      assert.expect(0);

      let jsPath = `dist/${asset}.js`;

      if (fs.existsSync(jsPath)) {
        let contents = fs.readFileSync(jsPath, 'utf-8');
        let sourcemap = fs.readFileSync(`dist/${asset}.map`, 'utf-8');

        validate(contents, sourcemap);
      }
    });
  });
});
