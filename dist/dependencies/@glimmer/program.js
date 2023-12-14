import { getInternalHelperManager, getInternalModifierManager, getInternalComponentManager, capabilityFlagsFrom, getComponentTemplate, managerHasCapability } from '@glimmer/manager';
import { templateFactory } from '@glimmer/opcode-compiler';
import { constants, enumerate, assert, unwrapTemplate, expect, unwrap } from '@glimmer/util';
import { InternalComponentCapabilities, OPERAND_LEN_MASK, ARG_SHIFT, MACHINE_MASK, TYPE_MASK } from '@glimmer/vm';
import { SexpOpcodes } from '@glimmer/wire-format';

/**
 * Default component template, which is a plain yield
 */
const DEFAULT_TEMPLATE_BLOCK = [[[SexpOpcodes.Yield, 1, null]], ['&default'], false, []];
const DEFAULT_TEMPLATE = {
  // random uuid
  id: '1b32f5c2-7623-43d6-a0ad-9672898920a1',
  moduleName: '__default__.hbs',
  block: JSON.stringify(DEFAULT_TEMPLATE_BLOCK),
  scope: null,
  isStrictMode: true
};

const WELL_KNOWN_EMPTY_ARRAY = Object.freeze([]);
const STARTER_CONSTANTS = constants(WELL_KNOWN_EMPTY_ARRAY);
const WELL_KNOWN_EMPTY_ARRAY_POSITION = STARTER_CONSTANTS.indexOf(WELL_KNOWN_EMPTY_ARRAY);
class CompileTimeConstantImpl {
  // `0` means NULL

  values = STARTER_CONSTANTS.slice();
  indexMap = new Map(this.values.map((value, index) => [value, index]));
  value(value) {
    let indexMap = this.indexMap;
    let index = indexMap.get(value);
    if (index === undefined) {
      index = this.values.push(value) - 1;
      indexMap.set(value, index);
    }
    return index;
  }
  array(values) {
    if (values.length === 0) {
      return WELL_KNOWN_EMPTY_ARRAY_POSITION;
    }
    let handles = new Array(values.length);
    for (let i = 0; i < values.length; i++) {
      handles[i] = this.value(values[i]);
    }
    return this.value(handles);
  }
  toPool() {
    return this.values;
  }
}
class RuntimeConstantsImpl {
  values;
  constructor(pool) {
    this.values = pool;
  }
  getValue(handle) {
    return this.values[handle];
  }
  getArray(value) {
    let handles = this.getValue(value);
    let reified = new Array(handles.length);
    for (const [i, n] of enumerate(handles)) {
      reified[i] = this.getValue(n);
    }
    return reified;
  }
}
class ConstantsImpl extends CompileTimeConstantImpl {
  reifiedArrs = {
    [WELL_KNOWN_EMPTY_ARRAY_POSITION]: WELL_KNOWN_EMPTY_ARRAY
  };
  defaultTemplate = templateFactory(DEFAULT_TEMPLATE)();

  // Used for tests and debugging purposes, and to be able to analyze large apps
  // This is why it's enabled even in production
  helperDefinitionCount = 0;
  modifierDefinitionCount = 0;
  componentDefinitionCount = 0;
  helperDefinitionCache = new WeakMap();
  modifierDefinitionCache = new WeakMap();
  componentDefinitionCache = new WeakMap();
  helper(definitionState,
  // TODO: Add a way to expose resolved name for debugging
  _resolvedName = null, isOptional) {
    let handle = this.helperDefinitionCache.get(definitionState);
    if (handle === undefined) {
      let managerOrHelper = getInternalHelperManager(definitionState, isOptional);
      if (managerOrHelper === null) {
        this.helperDefinitionCache.set(definitionState, null);
        return null;
      }
      assert(managerOrHelper, 'BUG: expected manager or helper');
      let helper = typeof managerOrHelper === 'function' ? managerOrHelper : managerOrHelper.getHelper(definitionState);
      handle = this.value(helper);
      this.helperDefinitionCache.set(definitionState, handle);
      this.helperDefinitionCount++;
    }
    return handle;
  }
  modifier(definitionState, resolvedName = null, isOptional) {
    let handle = this.modifierDefinitionCache.get(definitionState);
    if (handle === undefined) {
      let manager = getInternalModifierManager(definitionState, isOptional);
      if (manager === null) {
        this.modifierDefinitionCache.set(definitionState, null);
        return null;
      }
      let definition = {
        resolvedName,
        manager,
        state: definitionState
      };
      handle = this.value(definition);
      this.modifierDefinitionCache.set(definitionState, handle);
      this.modifierDefinitionCount++;
    }
    return handle;
  }
  component(definitionState, owner, isOptional) {
    let definition = this.componentDefinitionCache.get(definitionState);
    if (definition === undefined) {
      let manager = getInternalComponentManager(definitionState, isOptional);
      if (manager === null) {
        this.componentDefinitionCache.set(definitionState, null);
        return null;
      }
      assert(manager, 'BUG: expected manager');
      let capabilities = capabilityFlagsFrom(manager.getCapabilities(definitionState));
      let templateFactory = getComponentTemplate(definitionState);
      let compilable = null;
      let template;
      if (!managerHasCapability(manager, capabilities, InternalComponentCapabilities.dynamicLayout)) {
        template = templateFactory?.(owner) ?? this.defaultTemplate;
      } else {
        template = templateFactory?.(owner);
      }
      if (template !== undefined) {
        template = unwrapTemplate(template);
        compilable = managerHasCapability(manager, capabilities, InternalComponentCapabilities.wrapped) ? template.asWrappedLayout() : template.asLayout();
      }
      definition = {
        resolvedName: null,
        handle: -1,
        // replaced momentarily
        manager,
        capabilities,
        state: definitionState,
        compilable
      };
      definition.handle = this.value(definition);
      this.componentDefinitionCache.set(definitionState, definition);
      this.componentDefinitionCount++;
    }
    return definition;
  }
  resolvedComponent(resolvedDefinition, resolvedName) {
    let definition = this.componentDefinitionCache.get(resolvedDefinition);
    if (definition === undefined) {
      let {
        manager,
        state,
        template
      } = resolvedDefinition;
      let capabilities = capabilityFlagsFrom(manager.getCapabilities(resolvedDefinition));
      let compilable = null;
      if (!managerHasCapability(manager, capabilities, InternalComponentCapabilities.dynamicLayout)) {
        template = template ?? this.defaultTemplate;
      }
      if (template !== null) {
        template = unwrapTemplate(template);
        compilable = managerHasCapability(manager, capabilities, InternalComponentCapabilities.wrapped) ? template.asWrappedLayout() : template.asLayout();
      }
      definition = {
        resolvedName,
        handle: -1,
        // replaced momentarily
        manager,
        capabilities,
        state,
        compilable
      };
      definition.handle = this.value(definition);
      this.componentDefinitionCache.set(resolvedDefinition, definition);
      this.componentDefinitionCount++;
    }
    return expect(definition, 'BUG: resolved component definitions cannot be null');
  }
  getValue(index) {
    assert(index >= 0, `cannot get value for handle: ${index}`);
    return this.values[index];
  }
  getArray(index) {
    let reifiedArrs = this.reifiedArrs;
    let reified = reifiedArrs[index];
    if (reified === undefined) {
      let names = this.getValue(index);
      reified = new Array(names.length);
      for (const [i, name] of enumerate(names)) {
        reified[i] = this.getValue(name);
      }
      reifiedArrs[index] = reified;
    }
    return reified;
  }
}

class RuntimeOpImpl {
  offset = 0;
  constructor(heap) {
    this.heap = heap;
  }
  get size() {
    let rawType = this.heap.getbyaddr(this.offset);
    return ((rawType & OPERAND_LEN_MASK) >> ARG_SHIFT) + 1;
  }
  get isMachine() {
    let rawType = this.heap.getbyaddr(this.offset);
    return rawType & MACHINE_MASK ? 1 : 0;
  }
  get type() {
    return this.heap.getbyaddr(this.offset) & TYPE_MASK;
  }
  get op1() {
    return this.heap.getbyaddr(this.offset + 1);
  }
  get op2() {
    return this.heap.getbyaddr(this.offset + 2);
  }
  get op3() {
    return this.heap.getbyaddr(this.offset + 3);
  }
}

var TableSlotState = /*#__PURE__*/function (TableSlotState) {
  TableSlotState[TableSlotState["Allocated"] = 0] = "Allocated";
  TableSlotState[TableSlotState["Freed"] = 1] = "Freed";
  TableSlotState[TableSlotState["Purged"] = 2] = "Purged";
  TableSlotState[TableSlotState["Pointer"] = 3] = "Pointer";
  return TableSlotState;
}(TableSlotState || {});
const PAGE_SIZE = 0x100000;
class RuntimeHeapImpl {
  heap;
  table;
  constructor(serializedHeap) {
    let {
      buffer,
      table
    } = serializedHeap;
    this.heap = new Int32Array(buffer);
    this.table = table;
  }

  // It is illegal to close over this address, as compaction
  // may move it. However, it is legal to use this address
  // multiple times between compactions.
  getaddr(handle) {
    return unwrap(this.table[handle]);
  }
  getbyaddr(address) {
    return expect(this.heap[address], 'Access memory out of bounds of the heap');
  }
  sizeof(handle) {
    return sizeof(this.table);
  }
}
function hydrateHeap(serializedHeap) {
  return new RuntimeHeapImpl(serializedHeap);
}

/**
 * The Heap is responsible for dynamically allocating
 * memory in which we read/write the VM's instructions
 * from/to. When we malloc we pass out a VMHandle, which
 * is used as an indirect way of accessing the memory during
 * execution of the VM. Internally we track the different
 * regions of the memory in an int array known as the table.
 *
 * The table 32-bit aligned and has the following layout:
 *
 * | ... | hp (u32) |       info (u32)   | size (u32) |
 * | ... |  Handle  | Scope Size | State | Size       |
 * | ... | 32bits   | 30bits     | 2bits | 32bit      |
 *
 * With this information we effectively have the ability to
 * control when we want to free memory. That being said you
 * can not free during execution as raw address are only
 * valid during the execution. This means you cannot close
 * over them as you will have a bad memory access exception.
 */
class HeapImpl {
  offset = 0;
  heap;
  handleTable;
  handleState;
  handle = 0;
  constructor() {
    this.heap = new Int32Array(PAGE_SIZE);
    this.handleTable = [];
    this.handleState = [];
  }
  pushRaw(value) {
    this.sizeCheck();
    this.heap[this.offset++] = value;
  }
  pushOp(item) {
    this.pushRaw(item);
  }
  pushMachine(item) {
    this.pushRaw(item | MACHINE_MASK);
  }
  sizeCheck() {
    let {
      heap
    } = this;
    if (this.offset === this.heap.length) {
      let newHeap = new Int32Array(heap.length + PAGE_SIZE);
      newHeap.set(heap, 0);
      this.heap = newHeap;
    }
  }
  getbyaddr(address) {
    return unwrap(this.heap[address]);
  }
  setbyaddr(address, value) {
    this.heap[address] = value;
  }
  malloc() {
    // push offset, info, size
    this.handleTable.push(this.offset);
    return this.handleTable.length - 1;
  }
  finishMalloc(handle) {
  }
  size() {
    return this.offset;
  }

  // It is illegal to close over this address, as compaction
  // may move it. However, it is legal to use this address
  // multiple times between compactions.
  getaddr(handle) {
    return unwrap(this.handleTable[handle]);
  }
  sizeof(handle) {
    return sizeof(this.handleTable);
  }
  free(handle) {
    this.handleState[handle] = TableSlotState.Freed;
  }

  /**
   * The heap uses the [Mark-Compact Algorithm](https://en.wikipedia.org/wiki/Mark-compact_algorithm) to shift
   * reachable memory to the bottom of the heap and freeable
   * memory to the top of the heap. When we have shifted all
   * the reachable memory to the top of the heap, we move the
   * offset to the next free position.
   */
  compact() {
    let compactedSize = 0;
    let {
      handleTable,
      handleState,
      heap
    } = this;
    for (let i = 0; i < length; i++) {
      let offset = unwrap(handleTable[i]);
      let size = unwrap(handleTable[i + 1]) - unwrap(offset);
      let state = handleState[i];
      if (state === TableSlotState.Purged) {
        continue;
      } else if (state === TableSlotState.Freed) {
        // transition to "already freed" aka "purged"
        // a good improvement would be to reuse
        // these slots
        handleState[i] = TableSlotState.Purged;
        compactedSize += size;
      } else if (state === TableSlotState.Allocated) {
        for (let j = offset; j <= i + size; j++) {
          heap[j - compactedSize] = unwrap(heap[j]);
        }
        handleTable[i] = offset - compactedSize;
      } else if (state === TableSlotState.Pointer) {
        handleTable[i] = offset - compactedSize;
      }
    }
    this.offset = this.offset - compactedSize;
  }
  capture(offset = this.offset) {
    // Only called in eager mode
    let buffer = slice(this.heap, 0, offset).buffer;
    return {
      handle: this.handle,
      table: this.handleTable,
      buffer: buffer
    };
  }
}
class RuntimeProgramImpl {
  _opcode;
  constructor(constants, heap) {
    this.constants = constants;
    this.heap = heap;
    this._opcode = new RuntimeOpImpl(this.heap);
  }
  opcode(offset) {
    this._opcode.offset = offset;
    return this._opcode;
  }
}
function slice(arr, start, end) {
  if (arr.slice !== undefined) {
    return arr.slice(start, end);
  }
  let ret = new Int32Array(end);
  for (; start < end; start++) {
    ret[start] = unwrap(arr[start]);
  }
  return ret;
}
function sizeof(table, handle) {
  {
    return -1;
  }
}

function artifacts() {
  return {
    constants: new ConstantsImpl(),
    heap: new HeapImpl()
  };
}

export { CompileTimeConstantImpl, ConstantsImpl, HeapImpl, RuntimeConstantsImpl, RuntimeHeapImpl, RuntimeOpImpl, RuntimeProgramImpl, artifacts, hydrateHeap };
