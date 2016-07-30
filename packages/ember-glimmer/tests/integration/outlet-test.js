import { RenderingTest, moduleFor } from '../utils/test-case';
import { runAppend } from 'ember-runtime/tests/utils';

moduleFor('outlet view', class extends RenderingTest {
  constructor() {
    super(...arguments);

    let CoreOutlet = this.owner._lookupFactory('view:-outlet');
    this.component = CoreOutlet.create();
  }

  ['@htmlbars should render the outlet when set after DOM insertion']() {
    let outletState = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'application',
        controller: {},
        ViewClass: undefined,
        template: this.compile('HI{{outlet}}')
      },
      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('HI');

    this.assertStableRerender();

    outletState.outlets.main = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'application',
        controller: {},
        ViewClass: undefined,
        template: this.compile('<p>BYE</p>')
      },
      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HIBYE');
  }
});
