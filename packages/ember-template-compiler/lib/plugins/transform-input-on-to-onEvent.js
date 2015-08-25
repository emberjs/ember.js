import { deprecate } from 'ember-metal/debug';
import calculateLocationDisplay from 'ember-template-compiler/system/calculate-location-display';

/**
 @module ember
 @submodule ember-htmlbars
*/

/**
  An HTMLBars AST transformation that replaces all instances of

  ```handlebars
 {{input on="enter" action="doStuff"}}
 {{input on="key-press" action="doStuff"}}
  ```

  with

  ```handlebars
 {{input enter="doStuff"}}
 {{input key-press="doStuff"}}
  ```

  @private
  @class TransformInputOnToOnEvent
*/
function TransformInputOnToOnEvent(options) {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
  this.options = options || {};
}

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
TransformInputOnToOnEvent.prototype.transform = function TransformInputOnToOnEvent_transform(ast) {
  const pluginContext = this;
  const b = pluginContext.syntax.builders;
  const walker = new pluginContext.syntax.Walker();
  const moduleName = pluginContext.options.moduleName;

  walker.visit(ast, function(node) {
    if (pluginContext.validate(node)) {
      let action = hashPairForKey(node.hash, 'action');
      let on = hashPairForKey(node.hash, 'on');
      let onEvent = hashPairForKey(node.hash, 'onEvent');
      let normalizedOn = on || onEvent;
      let moduleInfo = calculateLocationDisplay(moduleName, node.loc);

      if (normalizedOn && normalizedOn.value.type !== 'StringLiteral') {
        deprecate(
          `Using a dynamic value for '#{normalizedOn.key}=' with the '{{input}}' helper ${moduleInfo}is deprecated.`,
          false,
          { id: 'ember-template-compiler.transform-input-on-to-onEvent.dynamic-value', until: '3.0.0' }
        );

        normalizedOn.key = 'onEvent';
        return; // exit early, as we cannot transform further
      }

      removeFromHash(node.hash, normalizedOn);
      removeFromHash(node.hash, action);

      if (!action) {
        deprecate(
          `Using '{{input ${normalizedOn.key}="${normalizedOn.value.value}" ...}}' without specifying an action ${moduleInfo}will do nothing.`,
          false,
          { id: 'ember-template-compiler.transform-input-on-to-onEvent.no-action', until: '3.0.0' }
        );

        return; // exit early, if no action was available there is nothing to do
      }


      let specifiedOn = normalizedOn ? `${normalizedOn.key}="${normalizedOn.value.value}" ` : '';
      if (normalizedOn && normalizedOn.value.value === 'keyPress') {
        // using `keyPress` in the root of the component will
        // clobber the keyPress event handler
        normalizedOn.value.value = 'key-press';
      }

      let expected = `${normalizedOn ? normalizedOn.value.value : 'enter'}="${action.value.original}"`;

      deprecate(
        `Using '{{input ${specifiedOn}action="${action.value.original}"}}' ${moduleInfo}is deprecated. Please use '{{input ${expected}}}' instead.`,
        false,
        { id: 'ember-template-compiler.transform-input-on-to-onEvent.normalized-on', until: '3.0.0' }
      );
      if (!normalizedOn) {
        normalizedOn = b.pair('onEvent', b.string('enter'));
      }

      node.hash.pairs.push(b.pair(
        normalizedOn.value.value,
        action.value
      ));
    }
  });

  return ast;
};

TransformInputOnToOnEvent.prototype.validate = function TransformWithAsToHash_validate(node) {
  return node.type === 'MustacheStatement' &&
    node.path.original === 'input' &&
    (
      hashPairForKey(node.hash, 'action') ||
        hashPairForKey(node.hash, 'on') ||
        hashPairForKey(node.hash, 'onEvent')
    );
};

function hashPairForKey(hash, key) {
  for (let i = 0, l = hash.pairs.length; i < l; i++) {
    let pair = hash.pairs[i];
    if (pair.key === key) {
      return pair;
    }
  }

  return false;
}

function removeFromHash(hash, pairToRemove) {
  var newPairs = [];
  for (let i = 0, l = hash.pairs.length; i < l; i++) {
    let pair = hash.pairs[i];

    if (pair !== pairToRemove) {
      newPairs.push(pair);
    }
  }

  hash.pairs = newPairs;
}

export default TransformInputOnToOnEvent;
