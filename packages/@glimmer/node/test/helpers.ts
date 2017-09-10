import { TestEnvironment, TestEnvironmentRenderDelegate, AbstractRenderTest, RenderDelegate } from "@glimmer/test-helpers";
import { IDOMChanges, DOMChanges } from '@glimmer/runtime';
import { Simple, Maybe } from '@glimmer/interfaces';
import { NodeDOMTreeConstruction } from '..';
import * as SimpleDOM from 'simple-dom';

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

class NodeEnvironment extends TestEnvironment {
  protected document: Simple.Document;
  constructor(options: NodeEnvironmentOptions) {
    super(testOptions(options));
    this.document = options.document;
  }
}

export class NodeRenderDelegate extends TestEnvironmentRenderDelegate {
  constructor() {
    super(new NodeEnvironment({ document: new SimpleDOM.Document() }));
  }
}

export class AbstractNodeTest extends AbstractRenderTest {
  private serializer: SimpleDOM.HTMLSerializer;
  constructor(delegate: RenderDelegate) {
    super(delegate);
    this.serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
  }

  assertHTML(html: string) {
    let serialized = this.serializer.serializeChildren(this.element);
    this.assert.equal(serialized, html);
  }
}
