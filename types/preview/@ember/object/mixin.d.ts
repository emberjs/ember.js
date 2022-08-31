declare module '@ember/object/mixin' {
  const __ember_mixin__: unique symbol;

  /**
   * The `Ember.Mixin` class allows you to create mixins, whose properties can be
   * added to other classes.
   */
  export default class Mixin {
    /**
     * Mixin needs to have *something* on its prototype, otherwise it's treated
     * like an empty interface. It cannot be private, sadly. We can use this to
     * carry around the types of the mixin so they don't get lost, though, so
     * that's... something?
     */
    [__ember_mixin__]: never;

    static create(...args: Array<Record<string, unknown> | Mixin>): Mixin;
  }
}
