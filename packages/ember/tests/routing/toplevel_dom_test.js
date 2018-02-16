import { ENV } from 'ember-environment';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

moduleFor('Top Level DOM Structure', class extends ApplicationTestCase {
  constructor() {
    super();
    this._APPLICATION_TEMPLATE_WRAPPER = ENV._APPLICATION_TEMPLATE_WRAPPER;
  }

  teardown() {
    super.teardown();
    ENV._APPLICATION_TEMPLATE_WRAPPER = this._APPLICATION_TEMPLATE_WRAPPER;
  }

  ['@test topmost template with wrapper']() {
    ENV._APPLICATION_TEMPLATE_WRAPPER = true;

    this.addTemplate('application', 'hello world');

    return this.visit('/').then(() => {
      this.assertComponentElement(this.element, { content: 'hello world' });
    });
  }

  ['@test topmost template without wrapper']() {
    ENV._APPLICATION_TEMPLATE_WRAPPER = false;

    this.addTemplate('application', 'hello world');

    return this.visit('/').then(() => {
      this.assertInnerHTML('hello world');
    });
  }
});
