import { Unique, Resolver as IResolver } from '@glimmer/interfaces';
import { TemplateMeta } from '@glimmer/wire-format';
import { CompilationOptions as ICompilationOptions } from './environment';

export type Specifier = Unique<'Specifier'>;
export type Resolver = IResolver<Specifier>;
export type CompilationOptions = ICompilationOptions<TemplateMeta, Specifier, Resolver>;

export {
  InternalComponent as Component,
  InternalComponentDefinition as ComponentDefinition,
  InternalComponentManager as ComponentManager
} from './component/interfaces';
