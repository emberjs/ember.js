declare module '@ember/-internals/glimmer/lib/views/outlet' {
  import { type InternalOwner } from '@ember/-internals/owner';
  import type { BootOptions } from '@ember/engine/instance';
  import type { Template, TemplateFactory } from '@glimmer/interfaces';
  import type { SimpleElement } from '@simple-dom/interface';
  import type { OutletDefinitionState } from '@ember/-internals/glimmer/lib/component-managers/outlet';
  import type { OutletState } from '@ember/-internals/glimmer/lib/utils/outlet';
  export interface BootEnvironment {
    hasDOM: boolean;
    isInteractive: boolean;
    _renderMode?: string;
    options: BootOptions;
  }
  export default class OutletView {
    private _environment;
    owner: InternalOwner;
    template: Template;
    namespace: any;
    static extend(injections: any): typeof OutletView;
    static reopenClass(injections: any): void;
    static create(options: {
      environment: BootEnvironment;
      application: InternalOwner;
      template: TemplateFactory;
    }): OutletView;
    private ref;
    state: OutletDefinitionState;
    constructor(
      _environment: BootEnvironment,
      owner: InternalOwner,
      template: Template,
      namespace: any
    );
    appendTo(selector: string | SimpleElement): void;
    rerender(): void;
    setOutletState(state: OutletState): void;
    destroy(): void;
  }
}
