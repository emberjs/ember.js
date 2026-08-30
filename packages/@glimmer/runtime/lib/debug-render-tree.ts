import { DEBUG } from '@glimmer/env';
import type {
  Bounds,
  CapturedArguments,
  CapturedRenderNode,
  CompilableProgram,
  ComponentDefinition,
  ComponentInstance,
  DebugRenderTree,
  Environment,
  ModifierInstance,
  Nullable,
  RenderNode,
  UpdatingOpcode,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import { assign } from '@glimmer/util/lib/object-utils';
import { StackImpl as Stack } from '@glimmer/util/lib/collections';

import type { VM } from './vm/append';
import type { UpdatingVM } from './vm';

import { registerDestructor } from '@glimmer/destroyable';
import { managerHasCapability } from '@glimmer/manager/lib/util/capabilities';
import { valueForRef } from '@glimmer/reference/lib/reference';
import { InternalComponentCapabilities } from '@glimmer/vm/lib/flags';
import assert from '@glimmer/debug-util/lib/assert';

import { ConcreteBounds } from './bounds';
import { hasCustomDebugRenderTreeLifecycle } from './component/interfaces';
import { createCapturedArgs, EMPTY_ARGS, reifyArgsDebug } from './vm/arguments';

interface InternalRenderNode<T extends object> extends RenderNode {
  bounds: Nullable<Bounds>;
  refs: Set<Ref<T>>;
  parent?: InternalRenderNode<T>;
}

let GUID = 0;

export class Ref<T extends object> {
  readonly id: number = GUID++;
  private value: Nullable<T>;

  constructor(value: T) {
    this.value = value;
  }

  get(): Nullable<T> {
    return this.value;
  }

  release(): void {
    if (DEBUG && this.value === null) {
      throw new Error('BUG: double release?');
    }

    this.value = null;
  }

  toString(): string {
    let label = `Ref ${this.id}`;

    if (this.value === null) {
      return `${label} (released)`;
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        return `${label}: ${this.value}`;
      } catch {
        return label;
      }
    }
  }
}

export default class DebugRenderTreeImpl<
  TBucket extends object,
> implements DebugRenderTree<TBucket> {
  private stack = new Stack<TBucket>();

  private refs = new WeakMap<TBucket, Ref<TBucket>>();
  private roots = new Set<Ref<TBucket>>();
  private nodes = new WeakMap<TBucket, InternalRenderNode<TBucket>>();

  begin(): void {
    this.reset();
  }

  create(state: TBucket, node: RenderNode): void {
    let internalNode: InternalRenderNode<TBucket> = assign({}, node, {
      bounds: null,
      refs: new Set<Ref<TBucket>>(),
    });
    this.nodes.set(state, internalNode);
    this.appendChild(internalNode, state);
    this.enter(state);
  }

  update(state: TBucket): void {
    this.enter(state);
  }

  didRender(state: TBucket, bounds: Bounds): void {
    if (DEBUG && this.stack.current !== state) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      throw new Error(`BUG: expecting ${this.stack.current}, got ${state}`);
    }

    this.nodeFor(state).bounds = bounds;
    this.exit();
  }

  willDestroy(state: TBucket): void {
    expect(this.refs.get(state), 'BUG: missing ref').release();
  }

  commit(): void {
    this.reset();
  }

  componentDidGetSelf(
    vm: VM,
    instance: ComponentInstance,
    selfRef: Reference,
    namesHandle: number
  ): void {
    let { definition, manager, state } = instance;

    let args: CapturedArguments;

    if (vm.stack.peek() === vm.args) {
      args = vm.args.capture();
    } else {
      let names = vm.constants.getArray<string>(namesHandle);
      vm.args.setup(vm.stack, names, [], 0, true);
      args = vm.args.capture();
    }

    let compilable: CompilableProgram | null = definition.compilable;

    if (compilable === null) {
      assert(
        managerHasCapability(
          manager,
          instance.capabilities,
          InternalComponentCapabilities.dynamicLayout
        ),
        'BUG: No template was found for this component, and the component did not have the dynamic layout capability'
      );

      let resolver = vm.context.resolver;
      compilable = resolver === null ? null : manager.getDynamicLayout(state, resolver);
    }

    // For tearing down the debugRenderTree
    vm.associateDestroyable(instance);

    if (hasCustomDebugRenderTreeLifecycle(manager)) {
      let nodes = manager.getDebugCustomRenderTree(instance.definition.state, instance.state, args);

      nodes.forEach((node) => {
        let { bucket } = node;
        this.create(bucket as TBucket, node);

        registerDestructor(instance, () => {
          this.willDestroy(bucket as TBucket);
        });

        vm.updateWith(new DebugRenderTreeUpdateOpcode(bucket));
      });
    } else {
      let name = getDebugName(definition, manager);

      this.create(instance as unknown as TBucket, {
        type: 'component',
        name,
        args,
        instance: valueForRef(selfRef),
      });

      registerDestructor(instance, () => {
        this.willDestroy(instance as unknown as TBucket);
      });

      vm.updateWith(new DebugRenderTreeUpdateOpcode(instance));
    }
  }

  componentDidRenderLayout(vm: VM, instance: ComponentInstance, bounds: Bounds): void {
    let { manager, state } = instance;

    if (hasCustomDebugRenderTreeLifecycle(manager)) {
      let nodes = manager.getDebugCustomRenderTree(instance.definition.state, state, EMPTY_ARGS);

      nodes.reverse().forEach((node) => {
        let { bucket } = node;

        this.didRender(bucket as TBucket, bounds);

        vm.updateWith(new DebugRenderTreeDidRenderOpcode(bucket, bounds));
      });
    } else {
      this.didRender(instance as unknown as TBucket, bounds);

      vm.updateWith(new DebugRenderTreeDidRenderOpcode(instance, bounds));
    }
  }

  modifierDidAdd(vm: VM, modifier: ModifierInstance, capturedArgs: CapturedArguments): void {
    const { manager, definition, state } = modifier;

    // TODO: we need a stable object for the debugRenderTree as the key, add support for
    // the case where the state is a primitive, or if in practice we always have/require
    // an object, then change the internal types to reflect that
    if (state === null || (typeof state !== 'object' && typeof state !== 'function')) {
      return;
    }

    let { element, constructing } = vm.tree();
    let name = definition.resolvedName ?? manager.getDebugName(definition.state);
    let instance = manager.getDebugInstance(state);

    assert(constructing, `Expected a constructing element in addModifier`);

    let bounds = new ConcreteBounds(element, constructing, constructing);

    this.create(state as TBucket, {
      type: 'modifier',
      name,
      args: capturedArgs,
      instance,
    });

    this.didRender(state as TBucket, bounds);

    // For tearing down the debugRenderTree
    vm.associateDestroyable(state);

    vm.updateWith(new DebugRenderTreeUpdateOpcode(state));
    vm.updateWith(new DebugRenderTreeDidRenderOpcode(state, bounds));

    registerDestructor(state, () => {
      this.willDestroy(state as TBucket);
    });
  }

  remoteElementDidPush(
    block: object,
    elementRef: Reference,
    insertBeforeRef: Reference,
    insertBefore: unknown
  ): void {
    // Note that there is nothing to update – when the args for an
    // {{#in-element}} changes it gets torn down and a new one is
    // re-created/rendered in its place (see the `Assert`s above)
    let args = createCapturedArgs(
      insertBefore === undefined ? {} : { insertBefore: insertBeforeRef },
      [elementRef]
    );

    this.create(block as TBucket, {
      type: 'keyword',
      name: 'in-element',
      args,
      instance: null,
    });

    registerDestructor(block, () => {
      this.willDestroy(block as TBucket);
    });
  }

  capture(): CapturedRenderNode[] {
    return this.captureRefs(this.roots);
  }

  private reset(): void {
    if (this.stack.size !== 0) {
      // We probably encountered an error during the rendering loop. This will
      // likely trigger undefined behavior and memory leaks as the error left
      // things in an inconsistent state. It is recommended that the user
      // refresh the page.

      // TODO: We could warn here? But this happens all the time in our tests?

      // Clean up the root reference to prevent errors from happening if we
      // attempt to capture the render tree (Ember Inspector may do this)
      let root = expect(this.stack.toArray()[0], 'expected root state when resetting render tree');
      let ref = this.refs.get(root);

      if (ref !== undefined) {
        this.roots.delete(ref);
      }

      while (!this.stack.isEmpty()) {
        this.stack.pop();
      }
    }
  }

  private enter(state: TBucket): void {
    this.stack.push(state);
  }

  private exit(): void {
    if (DEBUG && this.stack.size === 0) {
      throw new Error('BUG: unbalanced pop');
    }

    this.stack.pop();
  }

  private nodeFor(state: TBucket): InternalRenderNode<TBucket> {
    return expect(this.nodes.get(state), 'BUG: missing node');
  }

  private appendChild(node: InternalRenderNode<TBucket>, state: TBucket): void {
    if (DEBUG && this.refs.has(state)) {
      throw new Error('BUG: child already appended');
    }

    let parent = this.stack.current;
    let ref = new Ref(state);

    this.refs.set(state, ref);

    if (parent) {
      let parentNode = this.nodeFor(parent);
      parentNode.refs.add(ref);
      node.parent = parentNode;
    } else {
      this.roots.add(ref);
    }
  }

  private captureRefs(refs: Set<Ref<TBucket>>): CapturedRenderNode[] {
    let captured: CapturedRenderNode[] = [];

    refs.forEach((ref) => {
      let state = ref.get();

      if (state) {
        captured.push(this.captureNode(`render-node:${ref.id}`, state));
      } else {
        refs.delete(ref);
      }
    });

    return captured;
  }

  private captureNode(id: string, state: TBucket): CapturedRenderNode {
    let node = this.nodeFor(state);
    let { type, name, args, instance, refs } = node;
    let bounds = this.captureBounds(node);
    let children = this.captureRefs(refs);
    return { id, type, name, args: reifyArgsDebug(args), instance, bounds, children };
  }

  private captureBounds(node: InternalRenderNode<TBucket>): CapturedRenderNode['bounds'] {
    let bounds = expect(node.bounds, 'BUG: missing bounds');
    let parentElement = bounds.parentElement();
    let firstNode = bounds.firstNode();
    let lastNode = bounds.lastNode();
    return { parentElement, firstNode, lastNode };
  }
}

export function getDebugName(
  definition: ComponentDefinition,
  manager = definition.manager
): string {
  return definition.resolvedName ?? definition.debugName ?? manager.getDebugName(definition.state);
}

/**
 * The bookkeeping the VM does on behalf of the debug render tree. It lives
 * on the tree object rather than in the opcode handlers so that a build
 * which leaves the tree out also leaves this out.
 */
export interface RuntimeDebugRenderTree extends DebugRenderTree {
  componentDidGetSelf(
    vm: VM,
    instance: ComponentInstance,
    selfRef: Reference,
    namesHandle: number
  ): void;
  componentDidRenderLayout(vm: VM, instance: ComponentInstance, bounds: Bounds): void;
  modifierDidAdd(vm: VM, modifier: ModifierInstance, args: CapturedArguments): void;
  remoteElementDidPush(
    block: object,
    elementRef: Reference,
    insertBeforeRef: Reference,
    insertBefore: unknown
  ): void;
}

/**
 * The environment types its tree as the host-facing `DebugRenderTree`. The
 * runtime only ever receives `DebugRenderTreeImpl`, which also carries the
 * VM hooks.
 */
export function debugTree(env: Environment): RuntimeDebugRenderTree | undefined {
  return env.debugRenderTree as RuntimeDebugRenderTree | undefined;
}

export class DebugRenderTreeUpdateOpcode implements UpdatingOpcode {
  constructor(private bucket: object) {}

  evaluate(vm: UpdatingVM) {
    vm.env.debugRenderTree?.update(this.bucket);
  }
}

export class DebugRenderTreeDidRenderOpcode implements UpdatingOpcode {
  constructor(
    private bucket: object,
    private bounds: Bounds
  ) {}

  evaluate(vm: UpdatingVM) {
    vm.env.debugRenderTree?.didRender(this.bucket, this.bounds);
  }
}
