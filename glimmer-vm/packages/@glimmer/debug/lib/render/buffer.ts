import type { LogLine } from './entry';
import type { DisplayFragmentOptions, FlushedLines } from './logger';

import { ANNOTATION_STYLES } from './annotations';

/**
 * The `LogFragmentBuffer` is responsible for collecting the fragments that are logged to the
 * `DebugLogger` so that they can be accumulated during a group and flushed together.
 *
 * This queuing serves two purposes:
 *
 * 1. To allow the individual fragments that make up a single line to append their values to
 *    the current line. To accomplish this, each fragment can append static content and its
 *    formatting specifier (e.g. `%o`) to the accumulated {@link #template} *and* append the
 *    value to format to the {@link #substitutions} array.
 * 2. To allow logs that refer to objects to be represented as footnotes in the current line,
 *    with the footnote to be printed in a later line.
 *
 * This allows a list of fragments, each of which represent formattable values, to be flattened
 * into a single template string and an array of values to format.
 *
 * ## Footnotes
 *
 * An opcode slice containing constant references will be logged like this:
 *
 * ```
 * ...
 * 362. (PushArgs names=[] block-names=[] flags=16)
 * 366. (Helper helper=[0])
 * [0] glimmerHelper()
 * 368. (PopFrame)
 * 369. (Fetch register=$v0)
 * 371. (Primitive constant="/index.html")
 * ...
 * ```
 *
 * The fragment for line `366` includes an `ObjectFragment` for the helper value. When logged,
 * the object will be represented as a footnote and the value will be printed in a later
 * line.
 */
export class LogFragmentBuffer {
  /**
   * The first parameter to the `console.log` family of APIs is a *template* that can use
   * format specifiers (e.g. `%c`, `%o`, and `%O`) to refer to subsequent parameters.
   *
   * When a fragment is appended to a line,
   */
  #template = '';

  /**
   * Each format specified in the {@link #template} corresponds to a value in the
   * `#substitutions` array.
   */
  readonly #substitutions: unknown[] = [];

  /**
   * The logging options for the buffer, which currently only contains `showSubtle`.
   *
   * When fragments call the buffer's {@linkcode append} method, they specify whether the
   * content to append is subtle or not. If the buffer is not configured to show subtle
   * content, the content is not appended.
   *
   * This allows fragments to append content to the buffer without having to know how the
   * buffer is configured.
   */
  readonly #options: DisplayFragmentOptions;

  /**
   * A single line can produce multiple queued log entries. This happens when fragments
   * append *footnotes* to the buffer. A *reference* to the footnote is appended to the
   * primary line, and a line containing the *value* of the footnote is appended to the
   * `#queued` array.
   *
   * Both the primary line and any queued footnotes are flushed together when the buffer
   * is flushed.
   */
  readonly #footnotes: QueuedEntry[] = [];
  #nextFootnote = 1;
  #style = 0;

  constructor(options: DisplayFragmentOptions) {
    this.#options = options;
  }

  /**
   * Add a footnoted value to the current buffer.
   *
   * If the `subtle` option is set, the fragment will only be printed if the buffer is configured
   * to show subtle content.
   *
   * This method takes two callbacks: `add` and `append`.
   *
   * The `append` callback behaves like {@linkcode append}, but without the `subtle` argument. If
   * `addFootnoted` is called with `subtle: false`, then the callback will never be called, so
   * there is no need to pass the `subtle` argument again.
   *
   * The `add` callback is responsible for appending the footnote itself to the buffer. The first
   * parameter to `add` (`useNumber`) specifies whether the caller has used the footnote number
   * to refer to the footnote.
   *
   * This is typically true, but fragments can specify an alternative annotation that should be used
   * instead of the default footnote number. In that case, the footnote number is not used, and the
   * next footnote is free to use it.
   *
   * The `add` callback also takes a template string and an optional list of substitutions, which
   * describe the way the footnote itself should be formatted.
   */
  addFootnoted(
    subtle: boolean,
    add: (footnote: { n: number; style: string }, child: LogFragmentBuffer) => boolean
  ) {
    if (subtle && !this.#options.showSubtle) return;

    const child = new LogFragmentBuffer(this.#options);

    const style = ANNOTATION_STYLES[this.#style++ % ANNOTATION_STYLES.length] as string;

    const usedNumber = add({ n: this.#nextFootnote, style }, child);

    if (usedNumber) {
      this.#nextFootnote += 1;
    }

    this.#footnotes.push({
      type: 'line',
      subtle: false,
      template: child.#template,
      substitutions: child.#substitutions,
    });

    this.#footnotes.push(...child.#footnotes);
  }

  /**
   * Append a fragment to the current buffer.
   *
   * If the `subtle` option is set, the fragment will only be printed if the buffer is configured
   * to show subtle content.
   */
  append(subtle: boolean, template: string, ...substitutions: unknown[]) {
    if (subtle && !this.#options.showSubtle) return;
    this.#template += template;

    this.#substitutions.push(...substitutions);
  }

  #mapLine(line: QueuedLine): LogLine[] {
    if (line.subtle && !this.#options.showSubtle) return [];
    return [{ type: 'line', line: [line.template, ...line.substitutions] }];
  }

  flush(): FlushedLines {
    return [
      { type: 'line', line: [this.#template, ...this.#substitutions] },
      ...this.#footnotes.flatMap((queued) => this.#mapLine(queued)),
    ];
  }
}

interface QueuedLine {
  type: 'line';
  subtle: boolean;
  template: string;
  substitutions: unknown[];
}

type QueuedEntry = QueuedLine;
