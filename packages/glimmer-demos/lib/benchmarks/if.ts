import { TemplateBenchmarkScenario } from '../bench';

abstract class IfScenario extends TemplateBenchmarkScenario {
  start() {
    this.glimmerEnv.registerHelper('inline-if', ([cond, truthy, falsy]) => {
      return cond ? truthy : falsy;
    });

    super.start();
  }

  renderContext(): Object {
    return {
      truthy: true,
      falsy: false,
      first: "Kris",
      last: "Selden"
    };
  }

  test(render: () => HTMLElement) {
    let result = render().outerHTML;
    if (result !== '<div>Kris Selden</div>') {
      throw new Error(`Invalid render: ${result}`);
    }
  }

}

class InlineIfScenario extends IfScenario {
  name = 'inline if';
  description = 'two `inline-if` helpers';

  template() {
    return '{{inline-if truthy first "empty"}} {{inline-if falsy "empty" last}}';
  }
}

class BlockIfScenario extends IfScenario {
  name = 'block if';
  description = 'two `{{#if}}` blocks';

  template() {
    return '{{#if truthy}}{{first}}{{else}}empty{{/if}} {{#if falsy}}empty{{else}}{{last}}{{/if}}';
  }
}

export default [
  InlineIfScenario,
  BlockIfScenario
];
