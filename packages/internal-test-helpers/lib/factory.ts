function setProperties<T extends object>(object: T, properties: Partial<T>) {
  for (let key in properties) {
    if (Object.prototype.hasOwnProperty.call(properties, key)) {
      // SAFETY: we know that the property exists on `properties` because we
      // just checked as much with `hasOwnProperty`.
      object[key] = properties[key]!;
    }
  }
}

let guids = 0;

export default function factory() {
  class TestFactory {
    _guid: number;
    isDestroyed: boolean;

    constructor(options: Partial<TestFactory>) {
      setProperties(this, options);
      this._guid = guids++;
      this.isDestroyed = false;
    }

    destroy() {
      this.isDestroyed = true;
    }

    toString() {
      return '<Factory:' + this._guid + '>';
    }

    static create(options: Partial<TestFactory>) {
      return new TestFactory(options);
    }

    static reopenClass(options: Partial<typeof TestFactory>) {
      setProperties(this, options);
    }

    static extend(options: object) {
      class ChildTestFactory extends TestFactory {}
      setProperties(ChildTestFactory, options);
      return ChildTestFactory;
    }
  }

  return TestFactory;
}
