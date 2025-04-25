import { getFlagValues, LOCAL_SUBTLE_LOGGING } from '@glimmer/local-debug-flags';
import { LOCAL_LOGGER } from '@glimmer/util';

import type { LogEntry, LogLine } from './entry';
import type { IntoFormat } from './format';
import type { IntoFragment } from './fragment';

import { prepend } from './combinators';
import { as, frag, intoFragment } from './fragment';

export interface DisplayFragmentOptions {
  readonly showSubtle: boolean;
}

export type FlushedLines = [LogLine, ...LogEntry[]];

export class DebugLogger {
  static configured() {
    return new DebugLogger(LOCAL_LOGGER, { showSubtle: !!LOCAL_SUBTLE_LOGGING });
  }

  readonly #logger: typeof LOCAL_LOGGER;
  readonly #options: DisplayFragmentOptions;

  constructor(logger: typeof LOCAL_LOGGER, options: DisplayFragmentOptions) {
    this.#logger = logger;
    this.#options = options;
  }

  #logEntry(entry: LogEntry) {
    switch (entry.type) {
      case 'line': {
        this.#logger.debug(...entry.line);
        break;
      }

      case 'group': {
        if (entry.collapsed) {
          this.#logger.groupCollapsed(...entry.heading);
        } else {
          this.#logger.group(...entry.heading);
        }

        for (const line of entry.children) {
          this.#logEntry(line);
        }

        this.#logger.groupEnd();
      }
    }
  }

  #lines(type: 'log' | 'debug' | 'group' | 'groupCollapsed', lines: FlushedLines): void {
    const [first, ...rest] = lines;

    this.#logger[type](...first.line);

    for (const entry of rest) {
      this.#logEntry(entry);
    }
  }

  internals(...args: IntoFragment[]): void {
    this.#lines(
      'groupCollapsed',
      frag`🔍 ${intoFragment('internals').styleAll('internals')}`.toLoggable(this.#options)
    );
    this.#lines('debug', frag`${args}`.toLoggable(this.#options));
    this.#logger.groupEnd();
  }

  log(...args: IntoFragment[]): void {
    const fragment = frag`${args}`;

    if (!fragment.isEmpty(this.#options)) this.#lines('debug', fragment.toLoggable(this.#options));
  }

  labelled(label: string, ...args: IntoFragment[]): void {
    const fragment = frag`${args}`;

    const styles: IntoFormat[] = ['kw'];

    const { focus, focusColor } = getFlagValues('focus_highlight').includes(label)
      ? ({ focus: ['focus'], focusColor: ['focusColor'] } as const)
      : { focus: [], focusColor: [] };

    this.log(
      prepend(
        frag`${as.label(label)} `.styleAll(...styles, ...focus, ...focusColor),
        fragment.styleAll(...focus)
      )
    );
  }

  group(...args: IntoFragment[]): { expanded: () => () => void; collapsed: () => () => void } {
    return {
      expanded: () => {
        this.#lines('group', frag`${args}`.styleAll('unbold').toLoggable(this.#options));
        return () => this.#logger.groupEnd();
      },
      collapsed: () => {
        this.#lines('groupCollapsed', frag`${args}`.styleAll('unbold').toLoggable(this.#options));
        return () => this.#logger.groupEnd();
      },
    };
  }
}
