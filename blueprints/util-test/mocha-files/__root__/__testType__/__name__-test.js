import { expect } from 'chai';
import { describe, it } from 'mocha';
import <%= camelizedModuleName %> from '<%= dasherizedPackageName %>/utils/<%= dasherizedModuleName %>';

describe('<%= friendlyTestName %>', function() {
  // Replace this with your real tests.
  it('works', function() {
    let result = <%= camelizedModuleName %>();
    expect(result).to.be.ok;
  });
});
