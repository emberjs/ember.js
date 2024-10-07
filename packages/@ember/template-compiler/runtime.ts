import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';
import { precompile as glimmerPrecomile } from '@glimmer/compiler';
import type { ComponentLike } from '@glint/template';
import { default as compileOptions } from 'ember-template-compiler/lib/system/compile-options';

interface Params<ComponentClass extends abstract new (...args: any) => any> {
  component?: ComponentClass;
  strict?: boolean;
  moduleName?: string;
  eval?: () => Record<string, unknown>;
  scope?: (
    instance: ComponentClass extends ComponentLike<any> ? InstanceType<ComponentClass> : never
  ) => Record<string, unknown>;
}

export function template<Signature>(
  templateContent: string,
  params?: Params<never>
): ComponentLike<Signature>;

export function template<ComponentDefinition extends ComponentLike<any>>(
  templateContent: string,
  params: Params<ComponentDefinition>
): ComponentDefinition;

export function template(templateContent: string, config?: Params<ComponentLike<any>>) {
  let strictMode = config?.strict ?? true;

  let compiled = glimmerPrecomile(
    templateContent,
    // TODO: this implementation needs updated,
    //       because *this* scope doesn't pass the instance argument back.
    //       This is needed for private variable access.
    {
      ...compileOptions({}),
      strictMode,
      // @ts-expect-error, see above
      scope: config?.scope,
    }
  );

  let context = config?.component ? config.component : templateOnly();

  setComponentTemplate(compiled, context);

  return context;
}
