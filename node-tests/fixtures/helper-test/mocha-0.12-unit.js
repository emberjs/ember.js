import { expect } from 'chai';
import { describe, it } from 'mocha';
import { fooBarBaz } from 'my-app/helpers/foo/bar-baz';

describe('Unit | Helper | foo/bar-baz', function() {

  // Replace this with your real tests.
  it('works', function() {
    let result = fooBarBaz(42);
    expect(result).to.be.ok;
  });
});

