// Builders are created for each template the first time it is rendered.
// The builder walks through all statements, static and dynamic, and
// returns a result containing just the static statements with the
// dynamic morphs created for the statements. Subsequent rerenders
// can simply walk over the statements and apply them to the morphs.
export default class Builder {
  constructor(morph, frame) {
    this._frame = frame;

    this._parentMorph = morph;
    this._stack = new ElementStack({ builder: this, frame, bottomElement: morph.parentNode });
    this._morphs = [];
  }

  evaluateTemplate(template) {
    template.statements.forEach(this._render, this);
    return this._morphs;
  }

  /// Interaction with ElementStack

  createMorph(Type, attrs, parentElement) {
    Type = Type.specialize(attrs);
    let morph = new Type(parentElement, this._frame);
    morph.init(attrs);
    this._morphs.push(morph);
    return morph;
  }

  /// Utilities

  _render(statement) {
    let { _stack, _frame } = this;

    if (statement.isStatic) {
      statement.evaluate(_stack);
      return;
    }

    let syntaxExtension = _frame.syntaxExtension(statement);
    let content = statement.evaluate(_stack, _frame);
    content.append(_stack);
  }
}

class ElementStack {
  constructor({ builder, frame, bottomElement }) {
    this._builder = builder;
    this._frame = frame;
    this._dom = frame.dom();
    this._element = bottomElement;
    this._stack = [bottomElement];
  }

  _pushElement(element) {
    this._stack.push(element);
    this._element = element;
  }

  _popElement() {
    let { _stack }  = this;
    let top = _stack.pop();
    this._element = _stack[_stack.length - 1];
    return top;
  }

  appendStatement(statement) {
    this._builder._render(statement);
  }

  _createMorph(Type, attrs) {
    return this._builder.createMorph(Type, attrs, this._element);
  }

  createMorph(Type, attrs) {
    return this._createMorph(Type, attrs);
  }

  appendMorph(Type, attrs) {
    this._createMorph(Type, attrs).append(this);
  }

  appendText(text) {
    this._dom.appendChild(this._element, this._dom.createTextNode(text));
  }

  appendComment(value) {
    this._dom.appendChild(this._element, this._dom.createComment(value));
  }

  setAttribute(name, value) {
    this._dom.setAttribute(this._element, name, value);
  }

  setAttributeNS(name, value, namespace) {
    this._dom.setAttributeNS(this._element, name, value, namespace);
  }

  openElement(tag) {
    let element = this._dom.createElement(tag, this.contextualElement);
    this._pushElement(element);
    return element;
  }

  closeElement() {
    let child = this._popElement();
    this._dom.appendChild(this._element, child);
  }
}
