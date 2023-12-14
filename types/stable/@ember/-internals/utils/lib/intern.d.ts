declare module '@ember/-internals/utils/lib/intern' {
  /**
      Strongly hint runtimes to intern the provided string.

      When do I need to use this function?

      For the most part, never. Pre-mature optimization is bad, and often the
      runtime does exactly what you need it to, and more often the trade-off isn't
      worth it.

      Why?

      Runtimes store strings in at least 2 different representations:
      Ropes and Symbols (interned strings). The Rope provides a memory efficient
      data-structure for strings created from concatenation or some other string
      manipulation like splitting.

      Unfortunately checking equality of different ropes can be quite costly as
      runtimes must resort to clever string comparison algorithms. These
      algorithms typically cost in proportion to the length of the string.
      Luckily, this is where the Symbols (interned strings) shine. As Symbols are
      unique by their string content, equality checks can be done by pointer
      comparison.

      How do I know if my string is a rope or symbol?

      Typically (warning general sweeping statement, but truthy in runtimes at
      present) static strings created as part of the JS source are interned.
      Strings often used for comparisons can be interned at runtime if some
      criteria are met.  One of these criteria can be the size of the entire rope.
      For example, in chrome 38 a rope longer then 12 characters will not
      intern, nor will segments of that rope.

      Some numbers: http://jsperf.com/eval-vs-keys/8

      Known Trick™

      @private
      @return {String} interned version of the provided string
    */
  export default function intern<S extends string>(str: S): S;
}
