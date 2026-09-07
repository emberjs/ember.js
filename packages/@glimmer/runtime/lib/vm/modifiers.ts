import type { Environment, ModifierInstance } from '@glimmer/interfaces';
import { DEBUG } from '@glimmer/env';
import { track } from '@glimmer/validator/lib/tracking';
import { UPDATE_TAG as updateTag } from '@glimmer/validator/lib/validators';

/**
 * Modifier installs and updates run when the transaction commits. The
 * modifier opcodes queue them here, so an environment without modifiers
 * carries none of this.
 */
function installModifiers(modifiers: ModifierInstance[]): void {
  for (const { manager, state, definition } of modifiers) {
    let modifierTag = manager.getTag(state);

    if (modifierTag !== null) {
      let tag = track(
        () => manager.install(state),
        DEBUG &&
          `- While rendering:\n  (instance of a \`${
            definition.resolvedName || manager.getDebugName(definition.state)
          }\` modifier)`
      );
      updateTag(modifierTag, tag);
    } else {
      manager.install(state);
    }
  }
}

function updateModifiers(modifiers: ModifierInstance[]): void {
  for (const { manager, state, definition } of modifiers) {
    let modifierTag = manager.getTag(state);

    if (modifierTag !== null) {
      let tag = track(
        () => manager.update(state),
        DEBUG &&
          `- While rendering:\n  (instance of a \`${
            definition.resolvedName || manager.getDebugName(definition.state)
          }\` modifier)`
      );
      updateTag(modifierTag, tag);
    } else {
      manager.update(state);
    }
  }
}

export function scheduleInstallModifier(env: Environment, modifier: ModifierInstance): void {
  if (env.isInteractive) {
    env.schedule(installModifiers, modifier);
  }
}

export function scheduleUpdateModifier(env: Environment, modifier: ModifierInstance): void {
  if (env.isInteractive) {
    env.schedule(updateModifiers, modifier);
  }
}
