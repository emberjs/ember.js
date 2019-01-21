import { PrecompileOptions } from '@glimmer/compiler';
import { AnnotatedModuleLocator, Environment, Template, WireFormat } from '@glimmer/interfaces';
import { TemplateFactory } from '@glimmer/opcode-compiler';
export declare const DEFAULT_TEST_META: AnnotatedModuleLocator;
export declare function preprocess(
  template: string,
  meta?: AnnotatedModuleLocator
): Template<TemplateMeta<AnnotatedModuleLocator>>;
export declare function createTemplate<Locator>(
  templateSource: string,
  options?: PrecompileOptions
): TemplateFactory<Locator>;
export interface TestCompileOptions extends PrecompileOptions {
  env: Environment;
}
export declare function precompile(
  string: string,
  options?: TestCompileOptions
): WireFormat.SerializedTemplate<TemplateMeta>;
//# sourceMappingURL=compile.d.ts.map
