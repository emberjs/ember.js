import { RenderingTest, moduleFor } from '../utils/test-case';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

moduleFor('outlet view', class extends RenderingTest {
  constructor() {
    super(...arguments);

    let CoreOutlet = this.owner._lookupFactory('view:-outlet');
    this.top = CoreOutlet.create();
  }

  teardown() {
    runDestroy(this.top);

    super.teardown(...arguments);
  }

  withTemplate(string) {
    return {
      render: {
        template: this.compile(string)
      },
      outlets: {}
    };
  }

  appendTop() {
    runAppend(this.top);
  }

  ['@htmlbars should render the outlet when set after DOM insertion']() {
    let routerState = this.withTemplate('<h1>HI</h1>{{outlet}}');
    this.top.setOutletState(routerState);

    this.appendTop();

    this.assertText('HI');

    this.assertStableRerender();

    routerState.outlets.main = this.withTemplate('<p>BYE</p>');

    this.runTask(() => this.top.setOutletState(routerState));

    this.assertText('HIBYE');
  }
});
