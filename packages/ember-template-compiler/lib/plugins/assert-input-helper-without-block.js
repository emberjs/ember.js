import { assert } from 'ember-debug';
import calculateLocationDisplay from '../system/calculate-location-display';

export default function errorOnInputWithContent(env) {
  let { moduleName } = env.meta;

  return {
    name: 'assert-input-helper-without-block',

    visitors: {
      BlockStatement(node) {
        if (node.path.original !== 'input') { return; }

        assert(assertMessage(moduleName, node));
      }
    }
  };
}

function assertMessage(moduleName, node) {
  let sourceInformation = calculateLocationDisplay(moduleName, node.loc);

  return `The {{input}} helper cannot be used in block form. ${sourceInformation}`;
}
