import { TemplateBenchmarkScenario } from '../bench';

class NestedEmberishCurleyTaglessComponentsScenario extends TemplateBenchmarkScenario {
  name = "nested emberish curley tagless component";
  description = "10 outer components, each with 10 inner components";

  start() {
    this.glimmerEnv.registerStaticTaglessComponent("parent-component", null,
      `<h1>{{parent.name}}</h1>
        <ul>
          {{#each parent.children key="@index" as |child|}}
            {{child-component child=child parent=parent}}
          {{/each}}
        </ul>`);
    this.glimmerEnv.registerStaticTaglessComponent("child-component", null,
      `<li>{{child.name}} (from {{parent.name}})</li>`);

    super.start();
  }

  template() {
    return `{{#each parents key="@index" as |parent|}}
              {{parent-component parent=parent}}
            {{/each}}`;
  }

  renderContext(): Object {
    let context = {
      parents: []
    };

    for(let i=0; i<10; i++) {
      let parent = { name: `Parent ${i}`, children: [] };
      context.parents.push(parent);
      for(let j=0; j<10; j++) {
        parent.children.push({ name: `Child ${j}` });
      }
    }

    return context;
  }

  test(render: () => HTMLElement) {
    let element = render();

    let has10Parents = element.getElementsByTagName('h1').length === 10;
    let hasParentText = element.getElementsByTagName('h1')[0].textContent === 'Parent 0';
    let has100Children = element.getElementsByTagName('li').length === 100;
    let hasChildText = element.getElementsByTagName('li')[0].textContent === 'Child 0 (from Parent 0)';

    if(!has10Parents || !hasParentText || !has100Children || !hasChildText) {
      throw new Error(`Invalid render: ${element.outerHTML}`);
    }
  }
}

export default [
  NestedEmberishCurleyTaglessComponentsScenario
];
