import { expect } from 'chai';
import { describe, it } from 'mocha';
import EmberObject from '@ember/object';
import FooMixin from 'my-app/mixins/foo';

describe('Unit | Mixin | foo', function () {
  // TODO: Replace this with your real tests.
  it('works', function () {
    let FooObject = EmberObject.extend(FooMixin);
    let subject = FooObject.create();
    expect(subject).to.be.ok;
  });
});
