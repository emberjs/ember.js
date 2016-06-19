import SafeString from 'htmlbars-util/safe-string';
import { htmlSafe, isHtmlSafe } from 'ember-htmlbars/utils/string';
import isEnabled from 'ember-metal/features';
import { TestCase } from './abstract-test-case';
import { moduleFor } from './test-case';

moduleFor('SafeString', class extends TestCase {
  ['@test htmlSafe should return an instance of SafeString']() {
    let safeString = htmlSafe('you need to be more <b>bold</b>');

    this.assert.ok(safeString instanceof SafeString, 'should be a SafeString');
  }

  ['@test htmlSafe should return an empty string for null']() {
    let safeString = htmlSafe(null);

    this.assert.equal(safeString instanceof SafeString, true, 'should be a SafeString');
    this.assert.equal(safeString.toString(), '', 'should return an empty string');
  }

  ['@test htmlSafe should return an instance of SafeString']() {
    let safeString = htmlSafe();

    this.assert.equal(safeString instanceof SafeString, true, 'should be a SafeString');
    this.assert.equal(safeString.toString(), '', 'should return an empty string');
  }
});

if (isEnabled('ember-string-ishtmlsafe')) {
  moduleFor('SafeString isHtmlSafe', class extends TestCase {
    ['@test isHtmlSafe should detect SafeString']() {
      let safeString = htmlSafe('<em>Emphasize</em> the important things.');

      this.assert.ok(isHtmlSafe(safeString));
    }

    ['@test isHtmlSafe should not detect SafeString on primatives']() {
      this.assert.notOk(isHtmlSafe('Hello World'));
      this.assert.notOk(isHtmlSafe({}));
      this.assert.notOk(isHtmlSafe([]));
      this.assert.notOk(isHtmlSafe(10));
      this.assert.notOk(isHtmlSafe(null));
    }
  });
}
