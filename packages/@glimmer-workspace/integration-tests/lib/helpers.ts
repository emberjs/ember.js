import type { Arguments, Dict, HelperManager } from '@glimmer/interfaces';
import { helperCapabilities, setHelperManager } from '@glimmer/manager';

export type UserHelper = (args: ReadonlyArray<unknown>, named: Dict) => unknown;

interface UserHelperState {
  helper: UserHelper;
  args: Arguments;
}

/**
 * A public-API (`setHelperManager`) helper manager that calls a `UserHelper`
 * as `(positional, named)`. Args are read inside `getValue`, so they are
 * tracked by the helper's cache.
 */
class UserHelperManager implements HelperManager<UserHelperState> {
  capabilities = helperCapabilities('3.23', { hasValue: true });

  createHelper(definition: { helper: UserHelper }, args: Arguments): UserHelperState {
    return { helper: definition.helper, args };
  }

  getValue({ helper, args }: UserHelperState) {
    return helper([...args.positional], { ...args.named });
  }

  getDebugName(definition: { helper: UserHelper }) {
    return definition.helper.name || '(anonymous function)';
  }
}

const USER_HELPER_MANAGER = new UserHelperManager();

/** Wrap a `(positional, named) => value` function as a public-manager helper definition. */
export function defineUserHelper(helper: UserHelper): object {
  return setHelperManager(() => USER_HELPER_MANAGER, { helper });
}
