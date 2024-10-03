import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';
import { precompileTemplate } from '@ember/template-compilation';
// TODO: internalize these types and re-export from @glint/template.
// @ts-expect-error these types are too useful to be external
import type { ComponentLike } from '@glint/template';

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

  let compiled = precompileTemplate(templateContent, {
    strictMode,
    // TODO: this implementation needs updated,
    //       because *this* scope doesn't pass the instance argument back.
    //       This is needed for private variable access.
    // @ts-expect-error see above
    scope: config?.scope,
  });

  let context = config?.component ? config.component : templateOnly();

  setComponentTemplate(compiled, context);

  return context;
}
