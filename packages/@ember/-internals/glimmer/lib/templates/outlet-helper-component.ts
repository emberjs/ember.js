// @ts-ignore
import { Component, cell, $_fin, $_if, $_c } from '@lifeart/gxt';

export default class OutletHelper extends Component {
  get state() {
    let state = (this as any).args.state();
    if (typeof state === 'function') {
      state = state();
    }
    return state.outlets.main || state;
  }
  get nextState() {
    return () => {
      return this.hasNext;
    };
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
    const args = {
      get model() {
        return renderCell.value;
      },
    };

    render.controller['args'] = args;
    const tplComponentInstance = new tpl(args);
    tplComponentInstance.template = tplComponentInstance.template.bind(render.controller);
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

  // GXT template - renders outlet helper content
  static template = (ctx: any, parentEl: Element) => {
    const self = ctx;
    const roots: Array<Node | null | Node[]> = [];

    $_if(
      parentEl,
      roots,
      0,
      () => self.canRender,
      () => {
        const ifRoots: Array<Node | null | Node[]> = [];
        // Render MyComponent with model
        $_c(
          parentEl,
          ifRoots,
          0,
          () => self.MyComponent,
          () => ({ model: self.model }),
          {},
          () => {
            // Default slot with nested OutletHelper if hasNext
            if (self.hasNext) {
              const nestedRoots: Array<Node | null | Node[]> = [];
              $_c(
                parentEl,
                nestedRoots,
                0,
                () => OutletHelper,
                () => ({ state: self.nextState, root: false }),
                {},
                () => []
              );
              $_fin(nestedRoots);
              return nestedRoots;
            }
            return [];
          }
        );
        $_fin(ifRoots);
        return ifRoots;
      },
      () => []
    );

    $_fin(roots);
    return { nodes: roots, ctx };
  };
}
