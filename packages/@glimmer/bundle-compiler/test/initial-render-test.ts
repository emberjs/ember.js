import { Opaque, Resolver, Option, Dict } from "@glimmer/interfaces";
import {
  TestDynamicScope,
  UserHelper,
  HelperReference,
  TestMacros,
  RenderDelegate,
  InitialRenderSuite,
  rawModule
} from "@glimmer/test-helpers";
import { AbstractTestEnvironment } from "@glimmer/test-helpers/lib/environment";
import { BundleCompiler, CompilerDelegate, Specifier, SpecifierMap } from "@glimmer/bundle-compiler";
import { EagerOpcodeBuilder, ComponentCapabilities, OpcodeBuilderConstructor } from "@glimmer/opcode-compiler";
import { Program, RuntimeProgram, WriteOnlyProgram, RuntimeConstants } from "@glimmer/program";
import { elementBuilder, LowLevelVM, TemplateIterator, RenderResult, Helper } from "@glimmer/runtime";
import { UpdatableReference } from "@glimmer/object-reference";
import { renderSync } from "@glimmer/test-helpers/lib/abstract-test-case";
import { dict } from "@glimmer/util";

class BundledClientEnvironment extends AbstractTestEnvironment<Opaque> {
  protected program: Program<Opaque>;
  protected resolver: Resolver<Opaque>;

  constructor(options = {}) {
    super(options);
  }
}

class RuntimeResolver implements Resolver<Specifier> {
  constructor(private map: SpecifierMap, private modules: Modules) {}

  lookupHelper(_name: string, _meta: Opaque): Option<number> {
    throw new Error("Method not implemented.");
  }
  lookupModifier(_name: string, _meta: Opaque): Option<number> {
    throw new Error("Method not implemented.");
  }
  lookupComponent(_name: string, _meta: Opaque): Option<number> {
    throw new Error("Method not implemented.");
  }
  lookupPartial(_name: string, _meta: Opaque): Option<number> {
    throw new Error("Method not implemented.");
  }
  resolve<U>(specifier: number): U {
    let module = this.map.byHandle.get(specifier)!;
    return this.modules.get(module.module).get('default') as U;
  }
}

class Module {
  constructor(private dict: Dict<Opaque>) {
    Object.freeze(this.dict);
  }

  has(key: string) {
    return key in this.dict;
  }

  get(key: string): Opaque {
    return this.dict[key];
  }
}

class Modules {
  private registry = dict<Module>();

  has(name: string): boolean {
    return name in this.registry;
  }

  get(name: string): Module {
    return this.registry[name];
  }

  register(name: string, value: Dict<Opaque>) {
    this.registry[name] = new Module(value);
  }

  resolve(name: string, referer: Specifier): Option<string> {
    let local = referer.module.replace(/^((.*)\/)?([^\/]*)$/, `$1${name}`);
    if (this.registry[local]) {
      return local;
    } else if (this.registry[name]) {
      return name;
    } else {
      return null;
    }
  }
}

class BundlingDelegate implements CompilerDelegate {
  constructor(private modules: Modules) {}

  hasComponentInScope(_componentName: string, _referrer: Specifier): boolean {
    return false;
  }
  resolveComponentSpecifier(_componentName: string, _referrer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
  getComponentCapabilities(_specifier: Specifier): ComponentCapabilities {
    throw new Error("Method not implemented.");
  }

  hasHelperInScope(helperName: string, referer: Specifier): boolean {
    return this.modules.resolve(helperName, referer) !== null;
  }

  resolveHelperSpecifier(helperName: string, referer: Specifier): Specifier {
    let path = this.modules.resolve(helperName, referer);
    return { module: path!, name: 'default' };
  }

  hasModifierInScope(_modifierName: string, _referer: Specifier): boolean {
    return false;
  }
  resolveModifierSpecifier(_modifierName: string, _referer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
  hasPartialInScope(_partialName: string, _referer: Specifier): boolean {
    return false;
  }
  resolvePartialSpecifier(_partialName: string, _referer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
}

class BundlingRenderDelegate implements RenderDelegate {
  protected env = new BundledClientEnvironment();
  protected modules = new Modules();

  getInitialElement(): HTMLElement {
    return this.env.getAppendOperations().createElement('div') as HTMLElement;
  }

  registerComponent(_type: "Glimmer" | "Curly" | "Dynamic" | "Basic" | "Fragment", _name: string, _layout: string): void {
    throw new Error("Method not implemented.");
  }

  registerHelper(name: string, helper: UserHelper): void {
    let glimmerHelper: Helper = (_vm, args) => new HelperReference(helper, args);

    this.modules.register(name, { default: glimmerHelper });
  }

  renderTemplate(template: string, context: Dict<Opaque>, element: HTMLElement): RenderResult {
    let macros = new TestMacros();
    let delegate = new BundlingDelegate(this.modules);
    let program = new WriteOnlyProgram();
    let compiler = new BundleCompiler(macros, EagerOpcodeBuilder as OpcodeBuilderConstructor, delegate, program);

    let specifier = { module: 'main', name: 'default' };
    compiler.add(template, specifier);
    compiler.compile(specifier);

    let handle = compiler.getSpecifierMap().vmHandleBySpecifier.get(specifier);
    let { env } = this;

    let cursor = { element, nextSibling: null };
    let builder = elementBuilder({ mode: 'client', env, cursor });
    let self = new UpdatableReference(context);
    let dynamicScope = new TestDynamicScope();
    let resolver = new RuntimeResolver(compiler.getSpecifierMap(), this.modules);
    let pool = program.constants.toPool();
    let runtimeProgram = new RuntimeProgram(new RuntimeConstants(resolver, pool), program.heap);

    let vm = LowLevelVM.initial(runtimeProgram, env, self, null, dynamicScope, builder, handle);
    let iterator = new TemplateIterator(vm);

    return renderSync(env, iterator);  }
}

// module("[Bundle Compiler] Rehydration Tests", Rehydration);
rawModule("[Bundle Compiler] Initial Render Tests", InitialRenderSuite, BundlingRenderDelegate);
