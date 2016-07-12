import { TemplateBenchmarkScenario } from '../bench';

class SingleTextNodeScenario extends TemplateBenchmarkScenario {
  name = "single text node";
  description = "A simple static text template";

  template() {
    return `hi`;
  }

  renderContext(): Object {
    return {};
  }

  test(render: () => HTMLElement) {
    let result = render().outerHTML;
    if (result !== '<div>hi</div>') {
      throw new Error(`Invalid render: ${result}`);
    }
  }
}

export default [
  SingleTextNodeScenario
];
