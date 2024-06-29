import { Component } from '@lifeart/gxt';

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
    const args = {
      get model() {
        return render.model;
      }
    }
    if (tpl.instance) {
      return tpl.instance.template;
    }
    render.controller['args'] = args;
    const tplComponentInstance = new tpl(args);
    tplComponentInstance.template = tplComponentInstance.template.bind(render.controller);
    // we need to provide stable refs here to avoid re-renders
    tpl.instance = tplComponentInstance;
    return tplComponentInstance.template;
  }
  get model() {
    const state = this.state;
    const render = state.render;
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
