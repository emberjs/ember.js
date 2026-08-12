import { ENV } from '@ember/-internals/environment/lib/env';
import { VERSION } from '@ember/version';
import { DEBUG } from '@glimmer/env';

import { assert } from './assert';
import type { DeprecationOptions } from './deprecate';

/**
  Configuration for the deprecation staging system, provided by the app via
  `EmberENV.DEPRECATION_STAGES` (or swapped at runtime by test harnesses via
  `setDeprecationStagesConfig`).

  Deprecations move through two stages (see `deprecate`): "available" and
  "enabled". This config lets an app opt in to available-stage deprecations
  early, and lock in finished migrations by turning deprecations it no longer
  triggers into errors.
 */
export interface DeprecationStagesConfig {
  /**
    Turn on available-stage deprecations early. `true` enables all of them;
    an array enables specific deprecation ids.
   */
  enable?: true | string[];

  /**
    Compliance declaration: "this app does not use any deprecated API that
    was enabled as of this version of this package." Any deprecation from
    that package whose `since.enabled` is at or below the declared version
    throws instead of warning. A bare string is shorthand for
    `{ 'ember-source': version }`.
   */
  compliance?: string | Record<string, string>;

  /**
    Deprecation ids that throw when triggered, regardless of stage. This is
    how an app locks in a migration away from an available-stage deprecation
    it opted into via `enable`.
   */
  assert?: string[];

  /**
    Ids this configuration should treat as unconfigured: exempted from
    `compliance`/`assert` throwing, from `enable` (including `enable: true`),
    and from the removal simulation of `_OVERRIDE_DEPRECATION_VERSION`.
   */
  except?: string[];
}

let isDeprecationEnabledByConfig: (id: string) => boolean = () => false;
let isDeprecationExceptedByConfig: (id: string) => boolean = () => false;
let shouldThrowForDeprecation: (options: DeprecationOptions) => boolean = () => false;
let setDeprecationStagesConfig: (config: DeprecationStagesConfig | null) => void = () => {};

if (DEBUG) {
  interface NormalizedConfig {
    enableAll: boolean;
    enabledIds: Set<string>;
    compliance: Record<string, string>;
    assertIds: Set<string>;
    exceptIds: Set<string>;
  }

  // Numeric segment-wise comparison of dotted version strings. Unlike the
  // parseFloat-based `until` comparison in @ember/-internals/deprecations,
  // this orders multi-digit minors correctly (3.28 > 3.4), which matters
  // because compliance versions are arbitrary app-supplied versions.
  let compareVersions = (a: string, b: string): number => {
    let aParts = a.split('.').map((part) => parseInt(part, 10));
    let bParts = b.split('.').map((part) => parseInt(part, 10));
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      let diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };

  let isVersionString = (value: unknown): value is string =>
    typeof value === 'string' && /^\d+(\.\d+)*$/.test(value.replace(/[-+].*$/, ''));

  let isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((entry) => typeof entry === 'string');

  let normalize = (config: DeprecationStagesConfig | null | undefined): NormalizedConfig => {
    let normalized: NormalizedConfig = {
      enableAll: false,
      enabledIds: new Set(),
      compliance: {},
      assertIds: new Set(),
      exceptIds: new Set(),
    };

    if (config === null || config === undefined) {
      return normalized;
    }

    assert(
      `DEPRECATION_STAGES must be an object, got ${String(config)}`,
      typeof config === 'object'
    );

    let { enable, compliance, assert: assertIds, except } = config;

    if (enable !== undefined) {
      assert(
        `DEPRECATION_STAGES.enable must be \`true\` or an array of deprecation ids, got ${String(
          enable
        )}`,
        enable === true || isStringArray(enable)
      );
      if (enable === true) {
        normalized.enableAll = true;
      } else {
        normalized.enabledIds = new Set(enable);
      }
    }

    if (compliance !== undefined) {
      let byPackage = typeof compliance === 'string' ? { 'ember-source': compliance } : compliance;
      assert(
        `DEPRECATION_STAGES.compliance must be a version string or an object mapping package names to version strings, got ${String(
          compliance
        )}`,
        typeof byPackage === 'object' && byPackage !== null
      );
      for (let pkg of Object.keys(byPackage)) {
        let version = byPackage[pkg];
        assert(
          `DEPRECATION_STAGES.compliance['${pkg}'] must be a version string, got ${String(
            version
          )}`,
          isVersionString(version)
        );
        assert(
          `DEPRECATION_STAGES.compliance['ember-source'] is ${version}, which is newer than the installed ember-source (${VERSION}). Compliance cannot be declared against a version that is not installed.`,
          pkg !== 'ember-source' || compareVersions(version, VERSION) <= 0
        );
      }
      normalized.compliance = byPackage;
    }

    if (assertIds !== undefined) {
      assert(
        `DEPRECATION_STAGES.assert must be an array of deprecation ids, got ${String(assertIds)}`,
        isStringArray(assertIds)
      );
      normalized.assertIds = new Set(assertIds);
    }

    if (except !== undefined) {
      assert(
        `DEPRECATION_STAGES.except must be an array of deprecation ids, got ${String(except)}`,
        isStringArray(except)
      );
      normalized.exceptIds = new Set(except);
    }

    return normalized;
  };

  let bootConfig = ENV.DEPRECATION_STAGES as DeprecationStagesConfig | null;
  let current = normalize(bootConfig);

  isDeprecationEnabledByConfig = (id) =>
    (current.enableAll || current.enabledIds.has(id)) && !current.exceptIds.has(id);

  isDeprecationExceptedByConfig = (id) => current.exceptIds.has(id);

  shouldThrowForDeprecation = (options) => {
    if (current.exceptIds.has(options.id)) {
      return false;
    }
    if (current.assertIds.has(options.id)) {
      return true;
    }
    let compliantVersion = current.compliance[options.for];
    if (compliantVersion !== undefined && 'enabled' in options.since) {
      return compareVersions(options.since.enabled, compliantVersion) <= 0;
    }
    return false;
  };

  // null restores the boot (EmberENV) configuration — the correct teardown
  // for tests that swapped it — while `{}` is an explicitly empty config.
  setDeprecationStagesConfig = (config) => {
    current = normalize(config ?? bootConfig);
  };
}

export {
  isDeprecationEnabledByConfig,
  isDeprecationExceptedByConfig,
  shouldThrowForDeprecation,
  setDeprecationStagesConfig,
};
