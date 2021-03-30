/**
@module ember
*/
import { assert } from '@ember/debug';
import { CapturedArguments } from '@glimmer/interfaces';
import { createComputeRef, valueForRef } from '@glimmer/reference';
import { internalHelper } from './internal-helper';

export default internalHelper(({ positional, named }: CapturedArguments) => {
  assert(
    `[BUG] wrong number of positional arguments, expecting 1, got ${positional.length}`,
    positional.length === 1
  );

  let nameOrValueRef = positional[0];

  assert(`[BUG] expecting \`type\` named argument`, 'type' in named);
  assert(`[BUG] expecting \`loc\` named argument`, 'loc' in named);
  assert(`[BUG] expecting \`original\` named argument`, 'original' in named);

  let typeRef = named.type;
  let locRef = named.loc;
  let originalRef = named.original;

  // Bug: why do these fail?
  // assert('[BUG] expecting a string literal for the `type` argument', isConstRef(typeRef));
  // assert('[BUG] expecting a string literal for the `loc` argument', isConstRef(locRef));
  // assert('[BUG] expecting a string literal for the `original` argument', isConstRef(originalRef));

  const type = valueForRef(typeRef);
  const loc = valueForRef(locRef);
  const original = valueForRef(originalRef);

  assert('[BUG] expecting a string literal for the `type` argument', typeof type === 'string');
  assert('[BUG] expecting a string literal for the `loc` argument', typeof loc === 'string');
  assert(
    '[BUG] expecting a string literal for the `original` argument',
    typeof original === 'string'
  );

  return createComputeRef(() => {
    let nameOrValue = valueForRef(nameOrValueRef);

    assert(
      `Passing a dynamic string to the \`(${type})\` keyword is disallowed. ` +
        `(You specified \`(${type} ${original})\` and \`${original}\` evaluated into "${nameOrValue}".) ` +
        `This ensures we can statically analyze the template and determine which ${type}s are used. ` +
        `If the ${type} name is always the same, use a string literal instead, i.e. \`(${type} "${nameOrValue}")\`. ` +
        `Otherwise, import the ${type}s into JavaScript and pass them to the ${type} keyword. ` +
        'See https://github.com/emberjs/rfcs/blob/master/text/0496-handlebars-strict-mode.md#4-no-dynamic-resolution for details. ' +
        loc,
      typeof nameOrValue !== 'string'
    );

    return nameOrValue;
  });
});
