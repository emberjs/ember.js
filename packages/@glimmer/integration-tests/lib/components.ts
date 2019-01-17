import { EmberishGlimmerComponent } from './components/emberish-glimmer';
import { EmberishCurlyComponent } from './components/emberish-curly';
import { BasicComponent } from './components/basic';

export type ComponentKind = 'Glimmer' | 'Curly' | 'Dynamic' | 'Basic' | 'Fragment';

export interface ComponentTypes {
  Glimmer: typeof EmberishGlimmerComponent;
  Curly: typeof EmberishCurlyComponent;
  Dynamic: typeof EmberishCurlyComponent;
  Basic: typeof BasicComponent;
  Fragment: typeof BasicComponent;
}

export interface ComponentBlueprint {
  layout: string;
  tag?: string;
  else?: string;
  template?: string;
  name?: string;
  args?: Object;
  attributes?: Object;
  layoutAttributes?: Object;
  blockParams?: string[];
}

export const GLIMMER_TEST_COMPONENT = 'TestComponent';
export const CURLY_TEST_COMPONENT = 'test-component';
