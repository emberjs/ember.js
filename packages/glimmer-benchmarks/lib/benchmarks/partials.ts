import { TemplateBenchmarkScenario } from '../bench';

class StaticPartialScenario extends TemplateBenchmarkScenario {
  name = "static partial";
  description = "`{{partial 'greeting'}}`";

  start() {
    this.glimmerEnv.registerPartial('greeting', `Hi {{person1.name}} from a partial`);
    super.start();
  }

  template() {
    return `[{{partial 'greeting'}}]`;
  }

  renderContext(): Object {
    return {
      person1: { name: 'Alex Joyce' }
    };
  }

  test(render: () => HTMLElement) {
    let result = render().outerHTML;
    if (result !== '<div>[Hi Alex Joyce from a partial]</div>') {
      throw new Error(`Invalid render: ${result}`);
    }
  }
}

class DynamicPartialScenario extends TemplateBenchmarkScenario {
  name = "dynamic partial";
  description = "`{{partial partialName}}`";

  start() {
    this.glimmerEnv.registerPartial('greeting', `Hi {{person1.name}} from a partial`);
    super.start();
  }

  template() {
    return `[{{partial partialName}}]`;
  }

  renderContext(): Object {
    return {
      partialName: 'greeting',
      person1: { name: 'Ben Joyce' }
    };
  }

  test(render: () => HTMLElement) {
    let result = render().outerHTML;
    if (result !== '<div>[Hi Ben Joyce from a partial]</div>') {
      throw new Error(`Invalid render: ${result}`);
    }
  }
}

class BaselineScenario extends TemplateBenchmarkScenario {
  name = "baseline";
  description = "a template with no partial";

  template() {
    return `[Hi {{person1.name}} from a template]`;
  }

  renderContext(): Object {
    return {
      person1: { name: 'Sarah Galvin' }
    };
  }

  test(render: () => HTMLElement) {
    let result = render().outerHTML;
    if (result !== '<div>[Hi Sarah Galvin from a template]</div>') {
      throw new Error(`Invalid render: ${result}`);
    }
  }
}

export default [
  StaticPartialScenario,
  DynamicPartialScenario,
  BaselineScenario
];
