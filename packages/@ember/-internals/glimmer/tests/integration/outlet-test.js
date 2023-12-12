import { RenderingTestCase, moduleFor, runAppend, runTask } from 'internal-test-helpers';

moduleFor(
  'outlet view',
  class extends RenderingTestCase {
    constructor() {
      super(...arguments);

      let CoreOutlet = this.owner.factoryFor('view:-outlet');
      let outletTemplateFactory = this.owner.lookup('template:-outlet');
      let environment = this.owner.lookup('-environment:main');
      this.component = CoreOutlet.create({ environment, template: outletTemplateFactory });
    }

    ['@test should not error when initial rendered template is undefined']() {
      let outletState = {
        render: {
          owner: this.owner,
          into: undefined,
          outlet: 'main',
          name: 'application',
          controller: undefined,
          template: undefined,
        },

        outlets: Object.create(null),
      };

      runTask(() => this.component.setOutletState(outletState));

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
          template: undefined,
        },

        outlets: Object.create(null),
      };

      runTask(() => this.component.setOutletState(outletState));

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
          template: this.owner.lookup('template:application')(this.owner),
        },
        outlets: Object.create(null),
      };

      runTask(() => this.component.setOutletState(outletState));

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
          template: this.owner.lookup('template:index')(this.owner),
        },
        outlets: Object.create(null),
      };

      runTask(() => this.component.setOutletState(outletState));

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
          template: this.owner.lookup('template:application')(this.owner),
        },
        outlets: Object.create(null),
      };

      runTask(() => this.component.setOutletState(outletState));

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
          template: this.owner.lookup('template:index')(this.owner),
        },
        outlets: Object.create(null),
      };

      runTask(() => this.component.setOutletState(outletState));

      this.assertText('HIBYE');
    }

    ['@test outletState can pass through user code (liquid-fire initimate API) ']() {
      this.registerTemplate(
        'outer',
        'A{{#-with-dynamic-vars outletState=(identity (-get-dynamic-var "outletState"))}}B{{outlet}}D{{/-with-dynamic-vars}}E'
      );
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
          template: this.owner.lookup('template:outer')(this.owner),
        },
        outlets: {
          main: {
            render: {
              owner: this.owner,
              into: undefined,
              outlet: 'main',
              name: 'inner',
              controller: {},
              template: this.owner.lookup('template:inner')(this.owner),
            },
            outlets: Object.create(null),
          },
        },
      };

      runTask(() => this.component.setOutletState(outletState));

      runAppend(this.component);

      this.assertText('ABCDE');

      this.assertStableRerender();
    }
  }
);
