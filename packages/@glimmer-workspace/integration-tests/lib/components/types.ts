import type GlimmerComponent from '@glimmer/component';
import type { Dict } from '@glimmer/interfaces';
import type { TemplateOnlyComponent } from '@glimmer/runtime';

export type ComponentKind = 'Glimmer' | 'Curly' | 'Dynamic' | 'TemplateOnly' | 'Custom' | 'unknown';

export interface ComponentTypes {
  Glimmer: typeof GlimmerComponent;
  /** A Glimmer component invoked with curly syntax (`{{#test-component}}`). */
  Curly: typeof GlimmerComponent;
  /** A Glimmer component invoked through `{{component this.componentName}}`. */
  Dynamic: typeof GlimmerComponent;
  TemplateOnly: TemplateOnlyComponent;
  Custom: unknown;
  unknown: unknown;
}

export interface ComponentBlueprint {
  layout: string;
  tag?: string;
  else?: string;
  template?: string;
  name?: string;
  args?: Dict;
  attributes?: Dict;
  layoutAttributes?: Dict;
  blockParams?: string[];
}

export const GLIMMER_TEST_COMPONENT = 'TestComponent';
export const CURLY_TEST_COMPONENT = 'test-component';
