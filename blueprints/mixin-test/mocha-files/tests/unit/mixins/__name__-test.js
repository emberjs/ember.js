import { expect } from 'chai';
import { describe, it } from 'mocha';
import Ember from 'ember';
import <%= classifiedModuleName %>Mixin from '<%= dasherizedPackageName %>/mixins/<%= dasherizedModuleName %>';

describe('<%= friendlyTestName %>', function() {
  // Replace this with your real tests.
  it('works', function() {
    let <%= classifiedModuleName %>Object = Ember.Object.extend(<%= classifiedModuleName %>Mixin);
    let subject = <%= classifiedModuleName %>Object.create();
    expect(subject).to.be.ok;
  });
});
