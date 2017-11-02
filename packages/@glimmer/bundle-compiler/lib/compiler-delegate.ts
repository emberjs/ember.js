import { ProgramSymbolTable, ComponentCapabilities } from "@glimmer/interfaces";
import { ICompilableTemplate, CompileOptions } from "@glimmer/opcode-compiler";
import { SerializedTemplateBlock } from "@glimmer/wire-format";

import { TemplateLocator, ModuleLocator } from "./module-locators";

/**
 * A CompilerDelegate helps the BundleCompiler map external references it finds
 * in a template, such as other components and helpers, to their corresponding
 * implementation.
 *
 * For example, if the compiler comes across the string `<MyOtherComponent />`
 * in a template, it needs to know what template and component class on disk
 * `MyOtherComponent` refers to. By moving this decision-making to the delegate,
 * host environments can implement their own resolution semantics rather than
 * having resolution hardcoded into Glimmer.
 *
 * Because resolution often depends on where a component was invoked, many hooks
 * take a referrer, or the module locator for the template where the invocation
 * was found, as the second argument.
 *
 * For example, if the template with the locator `{ module:
 * 'src/ui/components/MyComponent.js', name: 'template' }` contains the string
 * `<MyOtherComponent />`, the compiler would invoke `hasComponentInScope` with
 * `'MyOtherComponent'` as the first argument and this locator as the second
 * argument.
 *
 * The CompilerDelegate is also responsible for describing the capabilities of a
 * particular component by returning a ComponentCapabilities descriptor. Glimmer
 * uses this information to perform additional optimizations during the
 * compilation phase.
 */
export default interface CompilerDelegate<Meta = {}> {
  /**
   * During compilation, the compiler will ask the delegate about each component
   * invocation found in the passed template. If the component exists in scope,
   * the delegate should return `true`. If the component does not exist in
   * scope, return `false`. Note that returning `false` will cause the
   * compilation process to fail.
   */
  hasComponentInScope(
    componentName: string,
    referrer: TemplateLocator<Meta>
  ): boolean;

  /**
   * If the delegate returns `true` from `hasComponentInScope()`, the compiler
   * will next ask the delegate to provide the module location for the named
   * component. By resolving symbolic component names into unique module
   * locations, the compiler avoids having to compile the same component
   * multiple times if invoked from different templates.
   */
  resolveComponent(
    componentName: string,
    referrer: TemplateLocator<Meta>
  ): ModuleLocator;

  /**
   * The compiler calls this hook with the return value of `resolveComponent`,
   * and it should return the required capabilities for the given component via
   * a ComponentCapabilities descriptor.
   */
  getComponentCapabilities(
    locator: TemplateLocator<Meta>
  ): ComponentCapabilities;

  /**
   * This hook is called with the return value of `resolveComponent`,
   * and it should return a compilable template that the compiler adds to the
   * set of templates to compile for the bundle.
   */
  getComponentLayout(
    locator: TemplateLocator<Meta>,
    block: SerializedTemplateBlock,
    options: CompileOptions<ModuleLocator>
  ): ICompilableTemplate<ProgramSymbolTable>;

  /**
   * During compilation, the compiler will ask the delegate about each possible
   * helper invocation found in the passed template. If the helper exists in
   * scope, the delegate should return `true`. If the helper does not exist
   * in scope, return `false`.
   *
   * Unlike with component resolution, note that returning `false` from this
   * hook does not always cause compilation to fail. That's because helpers may
   * be ambiguous with value expressions.
   *
   * For example, if the compiler encounters `{{currentTime}}` in a template, it
   * will call `hasHelperInScope` with `'currentTime'` as the first argument. If
   * `hasHelperInScope` returns `false`, the compiler will treat `currentTime`
   * as a value rather than a helper.
   */
  hasHelperInScope(helperName: string, referrer: TemplateLocator<Meta>): boolean;

  /**
   * If the delegate returns `true` from `hasHelperInScope()`, the compiler will
   * next ask the delegate to provide a module locator corresponding to the helper function.
   */
  resolveHelper(helperName: string, referrer: TemplateLocator<Meta>): ModuleLocator;

  /**
   * During compilation, the compiler will ask the delegate about each element
   * modifier invocation found in the passed template. Element modifiers are
   * mustaches that appear in the attribute position of elements, like
   * `<div {{elementModifier}}>`.
   *
   * If the modifier exists in scope, the delegate should return `true`. If the
   * modifier does not exist in scope, return `false`. Note that returning
   * `false` will cause the compilation process to fail.
   */
  hasModifierInScope(modifierName: string, referrer: TemplateLocator<Meta>): boolean;

  /**
   * If the delegate returns `true` from `hasModifierInScope()`, the compiler
   * will next ask the delegate to provide a module locator corresponding to the
   * element modifier function.
   */
  resolveModifier(modifierName: string, referrer: TemplateLocator<Meta>): ModuleLocator;

  /**
   * During compilation, the compiler will ask the delegate about each partial
   * invocation found in the passed template. Partials are invoked with a
   * special `partial` helper, like `{{partial "partialName"}}`.
   *
   * If the partial exists in scope, the delegate should return `true`. If the
   * partial does not exist in scope, return `false`. Note that returning
   * `false` will cause the compilation process to fail.
   *
   * Partials should be avoided because they disable many compiler
   * optimizations. Only legacy environments with backwards-compatibility
   * constraints should implement partials. New environments should always
   * return `false` from `hasPartialInScope` to disable the feature entirely.
   * Components replace all use cases for partials with better performance.
   */
  hasPartialInScope(partialName: string, referrer: TemplateLocator<Meta>): boolean;

  /**
   * If the delegate returns `true` from `hasPartialInScope()`, the compiler
   * will next ask the delegate to provide a module locator corresponding to the
   * partial template.
   */
  resolvePartial(
    partialName: string,
    referrer: TemplateLocator<Meta>
  ): ModuleLocator;
};
