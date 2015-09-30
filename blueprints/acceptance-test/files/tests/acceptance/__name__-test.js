import { module, test } from 'qunit';
import startApp from '<%= testFolderRoot %>/tests/helpers/start-app';
import destroyApp from '<%= testFolderRoot %>/tests/helpers/destroy-app';

module('<%= friendlyTestName %>', {
  beforeEach: function() {
    this.application = startApp();
  },

  afterEach: function() {
    destroyApp(this.application);
  }
});

test('visiting /<%= dasherizedModuleName %>', function(assert) {
  visit('/<%= dasherizedModuleName %>');

  andThen(function() {
    assert.equal(currentURL(), '/<%= dasherizedModuleName %>');
  });
});
