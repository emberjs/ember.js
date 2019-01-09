import {
  AnnotatedModuleLocator,
  DynamicScope,
  Environment,
  Option,
  Template,
  TemplateMeta,
} from '@glimmer/interfaces';
import { PathReference } from '@glimmer/reference';
import { ElementBuilder, TemplateIterator } from '@glimmer/runtime';
import { BasicComponent, BasicComponentFactory } from './environment/components/basic';
import {
  EmberishCurlyComponent,
  EmberishCurlyComponentFactory,
} from './environment/components/emberish-curly';
import {
  EmberishGlimmerComponent,
  EmberishGlimmerComponentFactory,
} from './environment/components/emberish-glimmer';

export type ComponentKind = 'Glimmer' | 'Curly' | 'Dynamic' | 'Basic' | 'Fragment';

export const CLASSES = {
  Glimmer: EmberishGlimmerComponent,
  Curly: EmberishCurlyComponent,
  Dynamic: EmberishCurlyComponent,
  Basic: BasicComponent,
  Fragment: BasicComponent,
};

export type ComponentTypes = typeof CLASSES;

export interface LazyEnv extends Environment {
  preprocess(
    template: string,
    meta?: AnnotatedModuleLocator
  ): Template<TemplateMeta<AnnotatedModuleLocator>>;

  renderMain(
    template: Template,
    self: PathReference<unknown>,
    builder: ElementBuilder,
    dynamicScope?: DynamicScope
  ): TemplateIterator;

  registerEmberishGlimmerComponent(
    name: string,
    Component: Option<EmberishGlimmerComponentFactory>,
    layoutSource: string
  ): void;

  registerEmberishCurlyComponent(
    name: string,
    Component: Option<EmberishCurlyComponentFactory>,
    layoutSource: Option<string>
  ): void;

  registerBasicComponent(
    name: string,
    Component: BasicComponentFactory,
    layoutSource: string
  ): void;
}
