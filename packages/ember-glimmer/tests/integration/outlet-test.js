import { RenderingTest, moduleFor } from '../utils/test-case';
import { runAppend } from 'internal-test-helpers';
import { set } from 'ember-metal';
import { RouteInfo, privateAccess } from 'ember-routing';

function makeRouteInfo(routeName, controller, template) {
  let info = new RouteInfo(routeName);
  let p = privateAccess(info);
  p.controller = controller;
  p.template = template;
  return info;
}

function setChild(routeInfo, outletName, child) {
  privateAccess(routeInfo).setChild(routeInfo, outletName, child);
}

moduleFor('outlet view', class extends RenderingTest {
  constructor() {
    super(...arguments);

    let CoreOutlet = this.owner.factoryFor('view:-outlet');

    this.component = CoreOutlet.create();
  }

  ['@test should not error when initial rendered template is undefined']() {
    let outletState = makeRouteInfo('application');
    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('');
  }

  ['@test should render the outlet when set after DOM insertion']() {
    let outletState = makeRouteInfo('application');
    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('');

    this.registerTemplate('application', 'HI{{outlet}}');
    outletState = makeRouteInfo('application', {}, this.owner.lookup('template:application'));

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HI');

    this.assertStableRerender();

    this.registerTemplate('index', '<p>BYE</p>');
    setChild(outletState, 'main', makeRouteInfo('index', {}, this.owner.lookup('template:index')));

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HIBYE');
  }

  ['@test should render the outlet when set before DOM insertion']() {
    this.registerTemplate('application', 'HI{{outlet}}');
    let outletState = makeRouteInfo('application', {}, this.owner.lookup('template:application'));

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('HI');

    this.assertStableRerender();

    this.registerTemplate('index', '<p>BYE</p>');
    setChild(outletState, 'main', makeRouteInfo('index', {}, this.owner.lookup('template:index')));

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HIBYE');
  }

  ['@test should support an optional name']() {
    this.registerTemplate('application', '<h1>HI</h1>{{outlet "special"}}');
    let outletState = makeRouteInfo('application', {}, this.owner.lookup('template:application'));

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('HI');

    this.assertStableRerender();

    this.registerTemplate('special', '<p>BYE</p>');
    setChild(outletState, 'special', makeRouteInfo('special', {}, this.owner.lookup('template:special')));

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HIBYE');
  }

  ['@test does not default outlet name when positional argument is present']() {
    this.registerTemplate('application', '<h1>HI</h1>{{outlet someUndefinedThing}}');
    let outletState = makeRouteInfo('application', {}, this.owner.lookup('template:application'));

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('HI');

    this.assertStableRerender();

    this.registerTemplate('special', '<p>BYE</p>');
    setChild(outletState, 'main', makeRouteInfo('special', {}, this.owner.lookup('template:special')));

    this.runTask(() => this.component.setOutletState(outletState));

    this.assertText('HI');
  }

  ['@test should support bound outlet name']() {
    let controller = { outletName: 'foo' };
    this.registerTemplate('application', '<h1>HI</h1>{{outlet outletName}}');
    let outletState = makeRouteInfo('application', controller, this.owner.lookup('template:application'));

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('HI');

    this.assertStableRerender();

    this.registerTemplate('foo', '<p>FOO</p>');
    setChild(outletState, 'foo', makeRouteInfo('foo', {}, this.owner.lookup('template:foo')));

    this.registerTemplate('bar', '<p>BAR</p>');
    setChild(outletState, 'bar', makeRouteInfo('bar', {}, this.owner.lookup('template:bar')));

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

    let outletState = makeRouteInfo('outer', {}, this.owner.lookup('template:outer'));
    setChild(outletState, 'main', makeRouteInfo('inner', {}, this.owner.lookup('template:inner')));

    this.runTask(() => this.component.setOutletState(outletState));

    runAppend(this.component);

    this.assertText('ABCDE');

    this.assertStableRerender();
  }

});
