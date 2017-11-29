import { deprecate } from 'ember-debug';
import calculateLocationDisplay from '../system/calculate-location-display';

/**
 @module ember
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
export default function transformInputOnToOnEvent(env) {
  let b = env.syntax.builders;
  let { moduleName } = env.meta;

  return {
    name: 'transform-input-on-to-onEvent',

    visitor: {
      MustacheStatement(node) {
        if (node.path.original !== 'input') {
          return;
        }

        let action = hashPairForKey(node.hash, 'action');
        let on = hashPairForKey(node.hash, 'on');
        let onEvent = hashPairForKey(node.hash, 'onEvent');

        if (!action && !on && !onEvent) {
          return;
        }


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
    }
  };
}

function hashPairForKey(hash, key) {
  for (let i = 0; i < hash.pairs.length; i++) {
    let pair = hash.pairs[i];
    if (pair.key === key) {
      return pair;
    }
  }

  return false;
}

function removeFromHash(hash, pairToRemove) {
  let newPairs = [];
  for (let i = 0; i < hash.pairs.length; i++) {
    let pair = hash.pairs[i];

    if (pair !== pairToRemove) {
      newPairs.push(pair);
    }
  }

  hash.pairs = newPairs;
}
