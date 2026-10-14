/**
 * The rehydration-suite delegate under the GXT backend.
 *
 * GXT does not rehydrate. This delegate runs the rehydration suites' shape
 * (a server render serialized to HTML, then a client render into the element
 * holding that HTML) with two plain GXT renders:
 *
 * - `renderServerSide` renders the template with GXT into a detached element
 *   and returns its HTML. GXT emits no Glimmer serialization markers (block
 *   comments, cursor scripts), and nothing here adds them.
 * - `renderClientSide` removes the element's children (the server HTML) and
 *   renders the template again. No server node is reused, so there are no
 *   rehydration stats; reading `rehydrationStats` throws.
 *
 * Tests whose assertions depend on real rehydration or on Glimmer's
 * serialization are listed, with the reason, in `GXT_UNSUPPORTED` below;
 * `test-helpers/module.ts` registers them as `QUnit.skip` under GXT.
 *
 * Templates compile through the GXT compile pipeline of the gxt-bridge.
 * Registered AST plugins go to it as `plugins.ast`, which runs them in the gxt
 * compiler's AST-transform hook; compile errors are thrown.
 */

import type {
  Dict,
  ElementNamespace,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleText,
} from '@glimmer/interfaces';
import type { ASTPluginBuilder } from '@glimmer/syntax';
import { castToSimple } from '@glimmer/debug-util';
import { helperCapabilities, setHelperManager } from '@glimmer/manager';
import { clearElement } from '@glimmer/util';
import { getGxtRenderer } from '@ember/-internals/gxt-backend/gxt-bridge';

import type { UserHelper } from '../../helpers';
import type RenderDelegate from '../../render-delegate';
import type { RenderHandle } from '../../render-delegate';

import { replaceHTML, toInnerHTML } from '../../dom/simple-utils';

// Why a test of the rehydration suites cannot run under GXT, by suite name
// (the test class's `suiteName`) and test name.
const STATS =
  'asserts rehydration stats (the server nodes the client pass cleared or kept); GXT does not rehydrate: its client render replaces the server DOM';
const MARKER_EDIT =
  'removes a Glimmer serialization marker (block comment) from the server HTML before the client pass; GXT emits no markers';
const IN_ELEMENT_CURSOR =
  "asserts Glimmer's in-element serialization (cursor script and block comments) in the remote element; GXT emits none";
const IN_ELEMENT_INSERT_BEFORE =
  'passes an element as {{#in-element}} insertBefore, which only the Glimmer VM accepts; Ember, and GXT with it, assert that insertBefore is null';
const SELECTED_SERIALIZATION =
  "expects the selected=true attribute that Glimmer's SerializeBuilder writes on the server and rehydration keeps; GXT does not serialize the selected property";
const CHAOS =
  'removes random nodes from the server HTML and checks that rehydration recovers; GXT discards the server HTML, so nothing is exercised';
const PARTIAL =
  'partial rehydration (rendering a component into a server-rendered subtree and asserting the cleared nodes) is not implemented by GXT';

const GXT_UNSUPPORTED: Record<string, Record<string, string>> = {
  rehydration: {
    'rehydrates into element with pre-existing content': STATS,
    'table with omitted tbody': STATS,
    'table with thead': STATS,
    'table with tfoot': STATS,
    'mismatched text nodes': STATS,
    'mismatched text nodes (server-render empty)': STATS,
    'missing closing block within multiple text nodes': MARKER_EDIT,
    'resumes correct block after reenabling rehydration': STATS,
    'mismatched elements': STATS,
    'text nodes surrounding single line handlebars comments': STATS,
    'text nodes surrounding multi line handlebars comments': STATS,
    'text nodes surrounding "stand alone" handlebars comment': STATS,
    'extra nodes at the end': STATS,
    'missing attributes': STATS,
    'remove extra attributes': STATS,
    'updates attribute to current value': STATS,
    'does not mutate attributes that already match': STATS,
    'Node curlies': STATS,
    'in-element can rehydrate': IN_ELEMENT_CURSOR,
    'in-element with insertBefore=null can rehydrate': IN_ELEMENT_CURSOR,
    'in-element with insertBefore=element can rehydrate': IN_ELEMENT_INSERT_BEFORE,
    'in-element can rehydrate into pre-existing content': STATS,
    'in-element with insertBefore=null can rehydrate into pre-existing content': STATS,
    'in-element with insertBefore=element can rehydrate into pre-existing content':
      IN_ELEMENT_INSERT_BEFORE,
    'nested in-element can rehydrate': IN_ELEMENT_CURSOR,
    'svg elements': STATS,
    'title tag': STATS,
    'script tag': STATS,
    'style tag': STATS,
    'clearing bounds': STATS,
    'top-level clearing bounds': STATS,
    '#each rehydration': STATS,
    'Dynamic selected options': SELECTED_SERIALIZATION,
    'Dynamic multi-select': SELECTED_SERIALIZATION,
  },
  // The component suite (`RehydratingComponents`).
  'initial render': {
    'Component invocations': STATS,
    'Mismatched Component invocations': STATS,
    '<p> invoking a block which emits a <div>': STATS,
    'Component invocations with block params': STATS,
    'Mismatched Component invocations with block params': STATS,
    'Component invocations with template': STATS,
    'Mismatched Component invocations with template': STATS,
    'Component invocations with empty args': STATS,
    'Multiple invocations': STATS,
    'Mismatched Multiple invocations': STATS,
    'interacting with builtins': STATS,
    'mismatched interacting with builtins': STATS,
    'mismatched blocks interacting with builtins': STATS,
    'Dynamic selected options': SELECTED_SERIALIZATION,
    'Dynamic multi-select': SELECTED_SERIALIZATION,
  },
  'chaos-rehydration': {
    'adjacent text nodes': CHAOS,
    '<p> invoking a block which emits a <div>': CHAOS,
  },
  'chaos-partial-rehydration': {
    'adjacent text nodes': CHAOS,
    '<p> invoking a block which emits a <div>': CHAOS,
  },
  'partial rehydration': {
    'can rehydrate from non starting blocks': PARTIAL,
    'can rehydrate multiple call sites': PARTIAL,
  },
};

/** The reason `testName` of `suiteName` cannot run under GXT, if listed. */
export function gxtUnsupportedReason(suiteName: string, testName: string): string | undefined {
  const suite = GXT_UNSUPPORTED[suiteName];
  return suite && Object.prototype.hasOwnProperty.call(suite, testName)
    ? suite[testName]
    : undefined;
}

interface GxtTemplate {
  render(context: object, parentElement: Element): unknown;
}
type GxtTemplateFactory = (owner?: object) => GxtTemplate;

function unsupported(what: string): Error {
  return new Error(`GxtRehydrationDelegate: ${what} is not supported under GXT`);
}

function gxtPipeline() {
  const pipeline = getGxtRenderer()?.compilePipeline;
  if (!pipeline?.compileTemplate || !pipeline.syncDomNow || !pipeline.triggerReRender) {
    throw new Error(
      'GxtRehydrationDelegate: the GXT compile pipeline (gxt-bridge) is not installed'
    );
  }
  return {
    compileTemplate: pipeline.compileTemplate,
    syncDomNow: pipeline.syncDomNow,
    triggerReRender: pipeline.triggerReRender,
  };
}

// `UserHelper` takes `(positional, named)`, the shape of a helper manager's
// `getValue`; this manager calls it with the invocation's arguments.
class UserHelperManager {
  capabilities = helperCapabilities('3.23', { hasValue: true });

  createHelper(fn: UserHelper, args: { positional: readonly unknown[]; named: Dict }) {
    return { fn, args };
  }

  getValue({
    fn,
    args,
  }: {
    fn: UserHelper;
    args: { positional: readonly unknown[]; named: Dict };
  }) {
    return fn(args.positional, args.named);
  }
}
const USER_HELPER_MANAGER = new UserHelperManager();

class GxtRenderHandle implements RenderHandle {
  constructor(
    private testContext: Dict,
    private renderContext: Dict,
    private element: SimpleElement
  ) {}

  // `RenderTest.set()` assigns to the test's context, which the client render
  // does not read (it renders a copy, see `renderClientSide`). Copy each
  // changed key to the render context and report it the way Ember's
  // `notifyPropertyChange` does (`triggerReRender`), then flush.
  rerender(): void {
    const { syncDomNow, triggerReRender } = gxtPipeline();
    for (const [key, value] of Object.entries(this.testContext)) {
      if (!(key in this.renderContext) || this.renderContext[key] !== value) {
        this.renderContext[key] = value;
        triggerReRender(this.renderContext, key, value);
      }
    }
    syncDomNow();
  }

  destroy(): void {
    clearElement(this.element);
  }
}

export class GxtRehydrationDelegate implements RenderDelegate {
  static readonly isEager = false;
  static readonly style = 'rehydration';

  readonly clientDoc: SimpleDocument = castToSimple(document);
  readonly serverDoc: SimpleDocument = castToSimple(document);

  private plugins: ASTPluginBuilder[] = [];
  private helpers: Dict = Object.create(null);

  get rehydrationStats(): never {
    throw unsupported('rehydrationStats (the client render does not reuse server nodes)');
  }

  getInitialElement(): SimpleElement {
    return this.clientDoc.createElement('div');
  }

  createElement(tagName: string): SimpleElement {
    return this.clientDoc.createElement(tagName);
  }

  createTextNode(content: string): SimpleText {
    return this.clientDoc.createTextNode(content);
  }

  createElementNS(namespace: ElementNamespace, tagName: string): SimpleElement {
    return this.clientDoc.createElementNS(namespace, tagName);
  }

  createDocumentFragment(): SimpleDocumentFragment {
    return this.clientDoc.createDocumentFragment();
  }

  getElementBuilder(): never {
    throw unsupported('getElementBuilder (GXT has no Glimmer tree builder)');
  }

  getSelf(): never {
    throw unsupported('getSelf (GXT renders without Glimmer references)');
  }

  renderServerSide(
    template: string,
    context: Dict,
    takeSnapshot: () => void,
    element: SimpleElement | undefined = undefined
  ): string {
    const target = element ?? this.serverDoc.createElement('div');
    // A copy: the server render is a one-off, and the client render owns the
    // live context.
    this.render(template, { ...context }, target);
    takeSnapshot();
    return this.serialize(target);
  }

  renderClientSide(template: string, context: Dict, element: SimpleElement): RenderHandle {
    clearElement(element);
    // A fresh plain object, not the test's context: the render reads the copy,
    // and `rerender()` copies changes over (see `GxtRenderHandle`).
    const renderContext = { ...context };
    this.render(template, renderContext, element);
    return new GxtRenderHandle(context, renderContext, element);
  }

  renderTemplate(
    template: string,
    context: Dict,
    element: SimpleElement,
    snapshot: () => void
  ): RenderHandle {
    const serialized = this.renderServerSide(template, context, snapshot);
    replaceHTML(element, serialized);
    const fixture = document.getElementById('qunit-fixture');
    if (!fixture) throw new Error('GxtRehydrationDelegate: #qunit-fixture is missing');
    fixture.appendChild(element as unknown as Element);
    return this.renderClientSide(template, context, element);
  }

  serialize(element: SimpleElement): string {
    return toInnerHTML(element);
  }

  registerPlugin(plugin: ASTPluginBuilder): void {
    this.plugins.push(plugin);
  }

  registerHelper(name: string, helper: UserHelper): void {
    this.helpers[name] = setHelperManager(() => USER_HELPER_MANAGER, helper);
  }

  registerHelperDefinition(name: string, definition: object): void {
    this.helpers[name] = definition;
  }

  // Only tests listed in `GXT_UNSUPPORTED` register components, modifiers or
  // internal helpers.
  registerComponent(): never {
    throw unsupported('registerComponent');
  }

  registerInternalHelper(): never {
    throw unsupported('registerInternalHelper (Glimmer VM internal helpers)');
  }

  registerModifier(): never {
    throw unsupported('registerModifier');
  }

  private render(template: string, context: object, target: SimpleElement): void {
    const factory = gxtPipeline().compileTemplate(template, {
      scopeValues: { ...this.helpers },
      plugins: { ast: this.plugins },
    }) as GxtTemplateFactory;
    factory().render(context, target as unknown as Element);
  }
}
