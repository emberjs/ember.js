import { Component, cell } from '@lifeart/gxt';

interface State {
  outlets: {
    main: State | undefined,
  },
  render: {
    template():  () => unknown,
    controller: unknown,
    name: string,
  }
}

export default class OutletHelper extends Component {
  get state() {
    return this.args.state().outlets.main || this.args.state();
  }
  get nextState() {
    return () => {
      return this.hasNext;
    }
  }
  get hasNext() {
    return this.state.outlets.main;
  }
  get canRender() {
    return !!this?.state?.render;
  }
  get MyComponent() {

    const state = this.state;
    const render = state.render;
    const tpl = render.template();
    if (tpl.instance) {
      tpl.renderCell.update(render.model);
      return tpl.instance.template;
    }
    const renderCell = cell(render.model);
    // console.log('render.model', render.model);
    const args = {
      get model() {
        return renderCell.value;
      }
    }

    render.controller['args'] = args;
    // render.controller.model = render.model;
    const tplComponentInstance = new tpl(args);
    tplComponentInstance.template = tplComponentInstance.template.bind(render.controller);
    // we need to provide stable refs here to avoid re-renders
    tpl.instance = tplComponentInstance;
    tpl.renderCell = renderCell;
    return tplComponentInstance.template;
  }
  get model() {
    const state = this.state;
    const render = state.render;
    console.log('getModel', render.model);
    return render.model;
  }
  <template>
    {{#if this.canRender}}
    <this.MyComponent @model={{this.model}}>
 {{#if this.hasNext}}
    <OutletHelper @state={{this.nextState}} @root={{false}} />
    {{/if}}
    </this.MyComponent>

    {{/if}}
  </template>
}
