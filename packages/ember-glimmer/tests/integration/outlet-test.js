import { RenderingTest, moduleFor } from '../utils/test-case';
import { runAppend } from 'internal-test-helpers';
import { set, isFeatureEnabled } from 'ember-metal';

moduleFor('outlet view', class extends RenderingTest {
  constructor() {
    super(...arguments);

    let CoreOutlet;
    if (isFeatureEnabled('ember-factory-for')) {
      CoreOutlet = this.owner.factoryFor('view:-outlet');
    } else {
      CoreOutlet = this.owner._lookupFactory('view:-outlet');
    }

    this.component = CoreOutlet.create();
  }

  ['@test should not error when initial rendered template is undefined']() {
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
  }

  ['@test should render the outlet when set after DOM insertion']() {
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

    this.registerTemplate('application', 'HI{{outlet}}');
    outletState = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'application',
        controller: {},
        ViewClass: undefined,
        template: this.owner.lookup('template:application')
      },
      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HI');

    this.assertStableRerender();

    this.registerTemplate('index', '<p>BYE</p>');
    outletState.outlets.main = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'index',
        controller: {},
        ViewClass: undefined,
        template: this.owner.lookup('template:index')
      },
      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HIBYE');
  }

  ['@test should render the outlet when set before DOM insertion']() {
    this.registerTemplate('application', 'HI{{outlet}}');
    let outletState = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'application',
        controller: {},
        ViewClass: undefined,
        template: this.owner.lookup('template:application')
      },
      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('HI');

    this.assertStableRerender();

    this.registerTemplate('index', '<p>BYE</p>');
    outletState.outlets.main = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'index',
        controller: {},
        ViewClass: undefined,
        template: this.owner.lookup('template:index')
      },
      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HIBYE');
  }

  ['@test should support an optional name']() {
    this.registerTemplate('application', '<h1>HI</h1>{{outlet "special"}}');
    let outletState = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'application',
        controller: {},
        ViewClass: undefined,
        template: this.owner.lookup('template:application')
      },
      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('HI');

    this.assertStableRerender();

    this.registerTemplate('special', '<p>BYE</p>');
    outletState.outlets.special = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'special',
        controller: {},
        ViewClass: undefined,
        template: this.owner.lookup('template:special')
      },
      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HIBYE');
  }

  ['@test does not default outlet name when positional argument is present']() {
    this.registerTemplate('application', '<h1>HI</h1>{{outlet someUndefinedThing}}');
    let outletState = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'application',
        controller: {},
        ViewClass: undefined,
        template: this.owner.lookup('template:application')
      },
      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('HI');

    this.assertStableRerender();

    this.registerTemplate('special', '<p>BYE</p>');
    outletState.outlets.main = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'special',
        controller: {},
        ViewClass: undefined,
        template: this.owner.lookup('template:special')
      },
      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HI');
  }

  ['@test should support bound outlet name']() {
    let controller = { outletName: 'foo' };
    this.registerTemplate('application', '<h1>HI</h1>{{outlet outletName}}');
    let outletState = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'application',
        controller,
        ViewClass: undefined,
        template: this.owner.lookup('template:application')
      },
      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('HI');

    this.assertStableRerender();

    this.registerTemplate('foo', '<p>FOO</p>');
    outletState.outlets.foo = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'foo',
        controller: {},
        ViewClass: undefined,
        template: this.owner.lookup('template:foo')
      },
      outlets: Object.create(null)
    };

    this.registerTemplate('bar', '<p>BAR</p>');
    outletState.outlets.bar = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'bar',
        controller: {},
        ViewClass: undefined,
        template: this.owner.lookup('template:bar')
      },
      outlets: Object.create(null)
    };

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HIFOO');

    this.runTask(() => set(controller, 'outletName', 'bar'));

    this.assertText('HIBAR');
  }

  ['@test outletState can pass through user code (liquid-fire initimate API) ']() {
    this.registerTemplate('outer', 'A{{#-with-dynamic-vars outletState=(identity (-get-dynamic-var "outletState"))}}B{{outlet}}D{{/-with-dynamic-vars}}E');
    this.registerTemplate('inner', 'C');

    // This looks like it doesn't do anything, but its presence
    // guarantees that the outletState gets converted from a reference
    // to a value and then back to a reference. That is what we're
    // testing here.
    this.registerHelper('identity', ([a]) => a);

    let outletState = {
      render: {
        owner: this.owner,
        into: undefined,
        outlet: 'main',
        name: 'outer',
        controller: {},
        ViewClass: undefined,
        template: this.owner.lookup('template:outer')
      },
      outlets: {
        main: {
          render: {
            owner: this.owner,
            into: undefined,
            outlet: 'main',
            name: 'inner',
            controller: {},
            ViewClass: undefined,
            template: this.owner.lookup('template:inner')
          },
          outlets: Object.create(null)
        }
      }
    };

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('ABCDE');

    this.assertStableRerender();
  }

});
