import { Controller } from 'ember-runtime';
import { QueryParamTestCase, moduleFor } from 'internal-test-helpers';

moduleFor('Query Params - paramless link-to', class extends QueryParamTestCase {
  testParamlessLinks(assert, routeName) {
    assert.expect(1);

    this.addTemplate(routeName, '{{link-to \'index\' \'index\' id=\'index-link\'}}');

    this.add(`controller:${routeName}`, Controller.extend({
      queryParams: ['foo'],
      foo: 'wat'
    }));

    return this.visit('/?foo=YEAH').then(() => {
      assert.equal(document.getElementById('index-link').getAttribute('href'), '/?foo=YEAH');
    });
  }

  ['@test param-less links in an app booted with query params in the URL don\'t reset the query params: application'](assert) {
    return this.testParamlessLinks(assert, 'application');
  }

  ['@test param-less links in an app booted with query params in the URL don\'t reset the query params: index'](assert) {
    return this.testParamlessLinks(assert, 'index');
  }
});
