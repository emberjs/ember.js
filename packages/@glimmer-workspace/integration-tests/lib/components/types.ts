import type GlimmerComponent from '@glimmer/component';
import type { Dict } from '@glimmer/interfaces';
import type { TemplateOnlyComponent } from '@ember/component/template-only';

export type ComponentKind = 'Glimmer' | 'TemplateOnly' | 'Custom' | 'unknown';

export interface ComponentTypes {
  Glimmer: typeof GlimmerComponent;
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
