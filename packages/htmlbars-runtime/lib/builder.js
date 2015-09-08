import { assert } from "../htmlbars-util";
import { struct } from "../htmlbars-util/object-utils";
import * as types from "../htmlbars-util/object-utils";

export const BuilderResult = struct({
  morphs: types.ARRAY,
  statements: types.ARRAY
});

// Builders are created for each template the first time it is rendered.
// The builder walks through all statements, static and dynamic, and
// returns a result containing just the static statements with the
// dynamic morphs created for the statements. Subsequent rerenders
// can simply walk over the statements and apply them to the morphs.
export default class Builder {
  constructor(renderNode, { env, scope, visitor }) {
    // REFACTOR TODO: Runtime is { env, scope, visitor }?
    this.env = env;
    this.dom = env.dom;
    this.scope = scope;
    this.visitor = visitor;

    this.renderNode = renderNode;
    this.contextualElement = this.originalContextualElement = renderNode.contextualElement;

    this.elementStack = [];
    // REFACTOR TODO: Allocate the right size for this? We could track the
    // number of dynamic things in the Template to avoid some amount of
    // repeated work.
    this.morphs = [];
    this.statements = [];
  }

  evaluateTemplate(template) {
    template.statements.forEach(statement => statement.render(this, this.dom));
  }

  /// Utilities

  openElement(tag) {
    let element = this.dom.createElement(tag, this.contextualElement);
    this.pushElement(element);
    return element;
  }

  closeElement() {
    this.appendChild(this.popElement());
  }

  createMorph(statement, unsafe) {
    let morph = new this.dom.MorphClass(this.dom, this.contextualElement);
    morph.frontBoundary = statement.frontBoundary;
    morph.backBoundary = statement.backBoundary;
    morph.parseTextAsHTML = !!unsafe;

    if (this.element) {
      morph.initForAppendingToElement(this.element).initParent(this.renderNode);
    } else {
      morph.initForAppendingToMorph(this.renderNode);
    }

    this.morphs.push(morph);
    return morph;
  }

  createAttrMorph(name, namespace) {
    assert(this.element, "createAttrMorph() requires an element");
    let morph = this.dom.createAttrMorph(this.element, name, namespace);
    this.morphs.push(morph);
    return morph;
  }

  createElementMorph() {
    let morph = this.dom.createElementMorph(this.element);
    this.morphs.push(morph);
    return morph;
  }

  appendChild(node) {
    if (this.element) {
      this.dom.appendChild(this.element, node);
    } else {
      this.renderNode.appendNode(node);
    }
  }

  evaluateStatement(statement, morph) {
    // This code assumes that the morph has been created through
    // builder.createMorph, which has put it into "appending" mode.
    // Once the statement is evaluated, the node is notified so it
    // can leave appending mode and insert an empty comment if
    // necessary.
    statement.evaluate(morph, this.env, this.scope, this.visitor, this);
    this.statements.push(statement);
    if (morph.finishAppend) { morph.finishAppend(); }
    morph.childMorphs = this.morphs;
  }

  pushElement(element) {
    this.elementStack.push(element);
    this.element = this.contextualElement = element;
  }

  popElement() {
    let top = this.elementStack.pop();
    let len = this.elementStack.length;

    if (len) {
      let element = this.elementStack[len - 1];
      this.element = this.contextualElement = element;
    } else {
      this.element = this.originalElement;
      this.contextualElement = this.renderNode.contextualElement;
    }

    return top;
  }
}
