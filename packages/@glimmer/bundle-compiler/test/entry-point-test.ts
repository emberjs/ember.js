import { module, test, EagerTestEnvironment } from "@glimmer/test-helpers";
import { BundleCompiler, CompilerDelegate, TemplateLocator } from "@glimmer/bundle-compiler";
import { RuntimeResolver, ComponentCapabilities, Option, VMHandle, Recast } from "@glimmer/interfaces";
import { RuntimeProgram } from "@glimmer/program";
import { LowLevelVM, NewElementBuilder, ComponentManager, MINIMAL_CAPABILITIES, ARGS, UNDEFINED_REFERENCE, PrimitiveReference } from "@glimmer/runtime";
import { CONSTANT_TAG, VersionedPathReference, Tag } from "@glimmer/reference";
import { Destroyable } from "@glimmer/util";

class TestCompilerDelegate implements CompilerDelegate {
  hasComponentInScope(): boolean {
    return false;
  }

  resolveComponent(): never {
    throw new Error("Method not implemented.");
  }

  getComponentCapabilities(): never {
    throw new Error("Method not implemented.");
  }

  getComponentLayout(): never {
    throw new Error("Method not implemented.");
  }

  hasHelperInScope(): boolean {
    return false;
  }

  resolveHelper(): never {
    throw new Error("Method not implemented.");
  }

  hasModifierInScope(): boolean {
    return false;
  }

  resolveModifier(): never {
    throw new Error("Method not implemented.");
  }

  hasPartialInScope(): boolean {
    return false;
  }

  resolvePartial(): never {
    throw new Error("Method not implemented.");
  }
}

class SimpleResolver implements RuntimeResolver<TemplateLocator> {
  lookupComponent(): never {
    throw new Error("Method not implemented.");
  }

  lookupPartial(): never {
    throw new Error("Method not implemented.");
  }

  resolve(): never {
    throw new Error("Method not implemented.");
  }
}

class BasicManager implements ComponentManager<null, null> {
  getCapabilities(): ComponentCapabilities {
    return MINIMAL_CAPABILITIES;
  }

  prepareArgs(): never {
    throw new Error("Method not implemented.");
  }

  create(): null {
    return null;
  }

  getSelf(): VersionedPathReference {
    return UNDEFINED_REFERENCE;
  }

  getTag(): Tag {
    return CONSTANT_TAG;
  }

  didRenderLayout(): void {
    return;
  }

  didCreate(): void {
    return;
  }

  update(): void {
    return;
  }

  didUpdateLayout(): void {
    return;
  }

  didUpdate(): void {
    return;
  }

  getDestructor(): Option<Destroyable> {
    return null;
  }
}

export class EntryPointTest {
  @test "an entry point"() {
    let compiler = new BundleCompiler(new TestCompilerDelegate());

    let titleLocator = { module: 'ui/components/Title', name: 'default' };
    let titleBlock = compiler.add(titleLocator, '<h1>{{@title}}</h1>');
    let { main, heap, pool, table } = compiler.compile();

    let env = new EagerTestEnvironment();
    let program = RuntimeProgram.hydrate(heap, pool, new SimpleResolver());

    let element = document.createElement('div');
    let builder = NewElementBuilder.forInitialRender(env, { element, nextSibling: null });

    env.begin();

    let vm = LowLevelVM.empty(program, env, builder);

    let title = table.vmHandleByModuleLocator.get(titleLocator);

    vm.pushFrame();

    // push three blocks onto the stack; TODO: Optimize
    for (let i = 0; i <= 9; i++) { vm.stack.push(null); }

    // @title="hello renderComponent"
    vm.stack.push(PrimitiveReference.create('hello renderComponent'));
    ARGS.setup(vm.stack, ['@title'], ['main', 'else', 'attrs'], 0, false);
    vm.stack.push(ARGS);

    // Setup `main()` by pushing an invocation and definition onto the stack
    vm.stack.push({ handle: title, symbolTable: { hasEval: false, symbols: titleBlock.symbols, referrer: null } });
    vm.stack.push({ state: null, manager: new BasicManager() });

    // invoke main()
    vm.execute(main as Recast<number, VMHandle>);

    env.commit();

    QUnit.assert.equal(element.innerHTML, '<h1>hello renderComponent</h1>');
  }
}

module("[bundle-compiler] entry point", EntryPointTest);
