import { EmberishGlimmerComponent } from './emberish-glimmer';
import { EmberishCurlyComponent } from './emberish-curly';
import { Dict } from '@glimmer/interfaces';
import { TemplateOnlyComponent } from '@glimmer/runtime';

export type ComponentKind = 'Glimmer' | 'Curly' | 'Dynamic' | 'TemplateOnly' | 'unknown';

export interface TestComponentConstructor<T> {
  new (): T;
}

export interface ComponentTypes {
  Glimmer: typeof EmberishGlimmerComponent;
  Curly: TestComponentConstructor<EmberishCurlyComponent>;
  Dynamic: TestComponentConstructor<EmberishCurlyComponent>;
  TemplateOnly: TemplateOnlyComponent;
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
