import { expect } from 'chai';
import { describe, it } from 'mocha';
import EmberObject from '@ember/object';
import <%= classifiedModuleName %>Mixin from '<%= dasherizedPackageName %>/mixins/<%= dasherizedModuleName %>';

describe('<%= friendlyTestName %>', function () {
  // TODO: Replace this with your real tests.
  it('works', function () {
    let <%= classifiedModuleName %>Object = EmberObject.extend(<%= classifiedModuleName %>Mixin);
    let subject = <%= classifiedModuleName %>Object.create();
    expect(subject).to.be.ok;
  });
});
