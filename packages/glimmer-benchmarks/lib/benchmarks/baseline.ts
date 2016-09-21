import { TemplateBenchmarkScenario, BenchmarkScenario } from '../bench';

class SingleTextNodeScenario extends TemplateBenchmarkScenario {
  public name = "single text node";
  public description = "A simple static text template";

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

export default <typeof BenchmarkScenario[]>[
  SingleTextNodeScenario
];
