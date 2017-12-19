import { RenderingTest, moduleFor } from '../utils/test-case';
import { runAppend } from 'internal-test-helpers';
import { set } from 'ember-metal';
import { RouteInfo } from 'ember-routing';

moduleFor('outlet view', class extends RenderingTest {
  constructor() {
    super(...arguments);

    let CoreOutlet = this.owner.factoryFor('view:-outlet');

    this.component = CoreOutlet.create();
  }

  ['@test should not error when initial rendered template is undefined']() {
    let outletState = new RouteInfo('application');
    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('');
  }

  ['@test should render the outlet when set after DOM insertion']() {
    let outletState = new RouteInfo('application');
    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('');

    this.registerTemplate('application', 'HI{{outlet}}');
    outletState = new RouteInfo('application', {}, this.owner.lookup('template:application'));

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HI');

    this.assertStableRerender();

    this.registerTemplate('index', '<p>BYE</p>');
    outletState.setChild('main', new RouteInfo('index', {}, this.owner.lookup('template:index')));

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HIBYE');
  }

  ['@test should render the outlet when set before DOM insertion']() {
    this.registerTemplate('application', 'HI{{outlet}}');
    let outletState = new RouteInfo('application', {}, this.owner.lookup('template:application'));

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('HI');

    this.assertStableRerender();

    this.registerTemplate('index', '<p>BYE</p>');
    outletState.setChild('main', new RouteInfo('index', {}, this.owner.lookup('template:index')));

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HIBYE');
  }

  ['@test should support an optional name']() {
    this.registerTemplate('application', '<h1>HI</h1>{{outlet "special"}}');
    let outletState = new RouteInfo('application', {}, this.owner.lookup('template:application'));

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('HI');

    this.assertStableRerender();

    this.registerTemplate('special', '<p>BYE</p>');
    outletState.setChild('special', new RouteInfo('special', {}, this.owner.lookup('template:special')));

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HIBYE');
  }

  ['@test does not default outlet name when positional argument is present']() {
    this.registerTemplate('application', '<h1>HI</h1>{{outlet someUndefinedThing}}');
    let outletState = new RouteInfo('application', {}, this.owner.lookup('template:application'));

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('HI');

    this.assertStableRerender();

    this.registerTemplate('special', '<p>BYE</p>');
    outletState.setChild('main', new RouteInfo('special', {}, this.owner.lookup('template:special')));

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HI');
  }

  ['@test should support bound outlet name']() {
    let controller = { outletName: 'foo' };
    this.registerTemplate('application', '<h1>HI</h1>{{outlet outletName}}');
    let outletState = new RouteInfo('application', controller, this.owner.lookup('template:application'));

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('HI');

    this.assertStableRerender();

    this.registerTemplate('foo', '<p>FOO</p>');
    outletState.setChild('foo', new RouteInfo('foo', {}, this.owner.lookup('template:foo')));

    this.registerTemplate('bar', '<p>BAR</p>');
    outletState.setChild('bar', new RouteInfo('bar', {}, this.owner.lookup('template:bar')));

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

    let outletState = new RouteInfo('outer', {}, this.owner.lookup('template:outer'));
    outletState.setChild('main', new RouteInfo('inner', {}, this.owner.lookup('template:inner')));

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('ABCDE');

    this.assertStableRerender();
  }

});
