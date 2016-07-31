import { RenderingTest, moduleFor } from '../utils/test-case';
import { runAppend } from 'ember-runtime/tests/utils';
import { set } from 'ember-metal/property_set';

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
        controller: undefined,
        ViewClass: undefined,
        template: undefined
      },

      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('');

    outletState = {
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

  ['@htmlbars should render the outlet when set before DOM insertion']() {
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

  ['@htmlbars should support an optional name']() {
    let outletState = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'application',
        controller: {},
        ViewClass: undefined,
        template: this.compile('<h1>HI</h1>{{outlet "special"}}')
      },
      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('HI');

    this.assertStableRerender();

    outletState.outlets.special = {
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

  ['@htmlbars should support bound outlet name']() {
    let controller = { outletName: 'foo' };
    let outletState = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'application',
        controller: controller,
        ViewClass: undefined,
        template: this.compile('<h1>HI</h1>{{outlet outletName}}')
      },
      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('HI');

    this.assertStableRerender();

    outletState.outlets.foo = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'application',
        controller: {},
        ViewClass: undefined,
        template: this.compile('<p>FOO</p>')
      },
      outlets: Object.create(null)
    };

    outletState.outlets.bar = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'application',
        controller: {},
        ViewClass: undefined,
        template: this.compile('<p>BAR</p>')
      },
      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HIFOO');

    this.runTask(() => set(controller, 'outletName', 'bar'));

    this.assertText('HIBAR');
  }
});
