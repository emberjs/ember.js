import { IDOMChanges, DOMChanges } from '@glimmer/runtime';
import { Simple, Maybe } from '@glimmer/interfaces';
import { NodeDOMTreeConstruction } from '@glimmer/node';
import * as SimpleDOM from 'simple-dom';

import LazyTestEnvironment from '../lazy/environment';
import LazyRenderDelegate from '../lazy/render-delegate';
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
    updateOperations = new DOMChanges(document as HTMLDocument);
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

export class NodeRenderDelegate extends LazyRenderDelegate {
  constructor() {
    super(new NodeEnv({ document: new SimpleDOM.Document() }));
  }
}

export class AbstractNodeTest extends RenderTest {
  private serializer: SimpleDOM.HTMLSerializer;
  constructor(delegate: RenderDelegate) {
    super(delegate);
    this.serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
  }

  assertHTML(html: string) {
    let serialized = this.serializer.serializeChildren(this.element);
    this.assert.equal(serialized, html);
  }

  assertComponent(html: string) {
    let el = this.element.firstChild! as Element;
    this.assert.equal(el.getAttribute('class'), 'ember-view');
    this.assert.ok(el.getAttribute('id'));
    this.assert.ok(el.getAttribute('id')!.indexOf('ember') > -1);
    let serialized = this.serializer.serializeChildren(this.element.firstChild!);
    this.assert.equal(serialized, html);
  }
}
