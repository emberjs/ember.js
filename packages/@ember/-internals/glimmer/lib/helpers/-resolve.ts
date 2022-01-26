/**
@module ember
*/
import { Owner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { CapturedArguments } from '@glimmer/interfaces';
import { createConstRef, isConstRef, valueForRef } from '@glimmer/reference';
import { internalHelper } from './internal-helper';

export default internalHelper(({ positional }: CapturedArguments, owner: Owner | undefined) => {
  // why is this allowed to be undefined in the first place?
  assert('[BUG] missing owner', owner);

  assert(
    `[BUG] wrong number of positional arguments, expecting 1, got ${positional.length}`,
    positional.length === 1
  );

  let fullNameRef = positional[0];

  assert('[BUG] expecting a string literal as argument', fullNameRef && isConstRef(fullNameRef));

  let fullName = valueForRef(fullNameRef);

  assert('[BUG] expecting a string literal as argument', typeof fullName === 'string');
  assert('[BUG] expecting a valid full name', fullName.split(':').length === 2);

  if (DEBUG) {
    let [type, name] = fullName.split(':');

    assert(
      `Attempted to invoke \`(-resolve "${fullName}")\`, but ${name} was not a valid ${type} name.`,
      owner.hasRegistration(fullName)
    );
  }

  return createConstRef(owner.factoryFor(fullName)?.class, `(-resolve "${fullName}")`);
});
