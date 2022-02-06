import { expect } from 'chai';
import { describeModule, it } from 'ember-mocha';

describeModule(
  'service:<%= dasherizedModuleName %>',
  '<%= friendlyTestDescription %>',
  {
    // Specify the other units that are required for this test.
    // needs: ['service:foo']
  },
  function () {
    // TODO: Replace this with your real tests.
    it('exists', function () {
      let service = this.subject();
      expect(service).to.be.ok;
    });
  }
);
