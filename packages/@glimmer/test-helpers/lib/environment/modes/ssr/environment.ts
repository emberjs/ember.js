import { IDOMChanges, DOMChanges } from '@glimmer/runtime';
import { Simple, Maybe } from '@glimmer/interfaces';
import { NodeDOMTreeConstruction } from '@glimmer/node';
import createHTMLDocument from '@simple-dom/document';
import HTMLSerializer from '@simple-dom/serializer';
import voidMap from '@simple-dom/void-map';

import LazyTestEnvironment from '../lazy/environment';
import LazyRenderDelegate from '../lazy/render-delegate';
import EagerRenderDelegate from '../eager/render-delegate';
import RenderDelegate from '../../../render-delegate';
import { RenderTest } from '../../../render-test';

export interface NodeEnvironmentOptions {
  document: Simple.Document;
  appendOperations?: NodeDOMTreeConstruction;
  updateOperations?: IDOMChanges;
}

function testOptions(options: NodeEnvironmentOptions) {
  let document = options.document;
  let appendOperations: Maybe<NodeDOMTreeConstruction> = options && options.appendOperations;
  let updateOperations: Maybe<IDOMChanges> = options && options.updateOperations;

  if (!appendOperations) {
    appendOperations = new NodeDOMTreeConstruction(document);
  }

  if (!updateOperations) {
    updateOperations = new DOMChanges(document);
  }

  return { appendOperations, updateOperations, document };
}

export class NodeEnv extends LazyTestEnvironment {
  protected document: Simple.Document;
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
  protected serializer: HTMLSerializer;
  constructor(delegate: RenderDelegate) {
    super(delegate);
    this.serializer = new HTMLSerializer(voidMap);
  }

  assertHTML(html: string) {
    let serialized = this.serializer.serializeChildren(this.element);
    this.assert.equal(serialized, html);
  }

  assertComponent(html: string) {
    let el = this.element.firstChild! as Element;

    if (this.testType !== 'Glimmer') {
      this.assert.equal(el.getAttribute('class'), 'ember-view');
      this.assert.ok(el.getAttribute('id'));
      this.assert.ok(el.getAttribute('id')!.indexOf('ember') > -1);
    }

    let serialized = this.serializer.serializeChildren(el);
    this.assert.equal(serialized, html);
  }
}
