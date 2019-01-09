import { GlimmerTreeChanges, GlimmerTreeConstruction, Maybe } from '@glimmer/interfaces';
import { NodeDOMTreeConstruction } from '@glimmer/node';
import { DOMChanges } from '@glimmer/runtime';
import createHTMLDocument from '@simple-dom/document';
import { SimpleDocument } from '@simple-dom/interface';
import { assertElement, toInnerHTML } from '../../../dom';
import RenderDelegate from '../../../render-delegate';
import { RenderTest } from '../../../render-test';
import EagerRenderDelegate from '../eager/render-delegate';
import LazyTestEnvironment, { TestEnvironmentOptions } from '../lazy/environment';
import LazyRenderDelegate from '../lazy/render-delegate';

export interface NodeEnvironmentOptions {
  document: SimpleDocument;
  appendOperations?: GlimmerTreeConstruction;
  updateOperations?: GlimmerTreeChanges;
}

function testOptions(options: NodeEnvironmentOptions): TestEnvironmentOptions {
  let document = options.document;
  let appendOperations: Maybe<GlimmerTreeConstruction> = options && options.appendOperations;
  let updateOperations: Maybe<GlimmerTreeChanges> = options && options.updateOperations;

  if (!appendOperations) {
    appendOperations = new NodeDOMTreeConstruction(document);
  }

  if (!updateOperations) {
    updateOperations = new DOMChanges(document);
  }

  return { appendOperations, updateOperations, document };
}

export class NodeEnv extends LazyTestEnvironment {
  protected document: SimpleDocument;
  constructor(options: NodeEnvironmentOptions) {
    super(testOptions(options));
    this.document = options.document;
  }
}

export class NodeLazyRenderDelegate extends LazyRenderDelegate {
  constructor() {
    super(new NodeEnv({ document: createHTMLDocument() }));
  }
}

export class NodeEagerRenderDelegate extends EagerRenderDelegate {
  constructor() {
    super(new NodeEnv({ document: createHTMLDocument() }));
  }
}

export class AbstractNodeTest extends RenderTest {
  constructor(delegate: RenderDelegate) {
    super(delegate);
  }

  assertHTML(html: string) {
    let serialized = toInnerHTML(this.element);
    this.assert.equal(serialized, html);
  }

  assertComponent(html: string) {
    let el = assertElement(this.element.firstChild);

    if (this.testType !== 'Glimmer') {
      this.assert.equal(el.getAttribute('class'), 'ember-view');
      this.assert.ok(el.getAttribute('id'));
      this.assert.ok(el.getAttribute('id')!.indexOf('ember') > -1);
    }

    let serialized = toInnerHTML(el);
    this.assert.equal(serialized, html);
  }
}

export class NodeRenderDelegate extends EagerRenderDelegate {
  constructor(env = new NodeEnv({ document: createHTMLDocument() })) {
    super(env);
  }
}
