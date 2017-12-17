import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

moduleFor('Top Level DOM Structure', class extends ApplicationTestCase {
  ['@feature(!ember-glimmer-remove-application-template-wrapper) Topmost template always get an element']() {
    this.addTemplate('application', 'hello world');

    return this.visit('/').then(() => {
      this.assertComponentElement(this.element, { content: 'hello world' });
    });
  }

  ['@feature(ember-glimmer-remove-application-template-wrapper) Topmost template does not get an element']() {
    this.addTemplate('application', 'hello world');

    return this.visit('/').then(() => {
      this.assertInnerHTML('hello world');
    });
  }
});
