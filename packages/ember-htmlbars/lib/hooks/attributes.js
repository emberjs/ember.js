import { render, internal } from 'htmlbars-runtime';

export default function attributes(morph, env, scope, template, parentNode, visitor) {
  let state = morph.state;
  let block = state.block;

  if (!block) {
    let element = findRootElement(parentNode);
    if (!element) { return; }

    normalizeClassStatement(template.statements, element);

    template.element = element;
    block = morph.state.block = internal.blockFor(render, template, { scope });
  }

  block(env, [], undefined, morph, undefined, visitor);
}

function normalizeClassStatement(statements, element) {
  let className = element.getAttribute('class');
  if (!className) { return; }

  for (let i=0, l=statements.length; i<l; i++) {
    let statement = statements[i];

    if (statement[1] === 'class') {
      statement[2][2].unshift(className);
    }
  }
}

function findRootElement(parentNode) {
  let node = parentNode.firstChild;
  let found = null;

  while (node) {
    if (node.nodeType === 1) {
      // found more than one top-level element, so there is no "root element"
      if (found) { return null; }
      found = node;
    }
    node = node.nextSibling;
  }

  let className = found && found.getAttribute('class');
  if (!className || className.split(' ').indexOf('ember-view') === -1) {
    return found;
  }
}
