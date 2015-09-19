export class Morph {
    constructor(parentNode, frame) {
        this.frame = frame;
        // public, used by Builder
        this.parentNode = parentNode; // public, used by Builder
        this.nextSibling = null;
    }
    static specialize() { return this; }
    init(options) {
        throw new Error(`Unimplemented init for ${this.constructor.name}`);
    }
    /**
      This method gets called during the initial render process. A morph should
      append its contents to the stack.
    */
    append(stack) {
        throw new Error(`Unimplemented append for ${this.constructor.name}`);
    }
    /**
      This method gets called during rerenders. A morph is responsible for
      detecting that no work needs to be done, or updating its bounds based
      on changes to input references.
  
      It is also responsible for managing its own bounds.
    */
    update() {
        throw new Error(`Unimplemented update for ${this.constructor.name}`);
    }
    /**
      This method gets called when a parent list is being cleared, which means
      that the area of DOM that this morph represents will not exist anymore.
  
      The morph should destroy its input reference (a forked reference or other
      composed reference).
  
      Normally, you don't need to manage DOM teardown here because the parent
      morph that contains this one will clear the DOM all at once. However,
      if the morph type supports being moved (a "wormhole"), then it will need
      to remember that it was moved and clear the DOM here.
    */
    destroy() {
        throw new Error(`Unimplemented destroy for ${this.constructor.name}`);
    }
}
export function clear(bounds) {
    let parent = bounds.parentNode();
    let first = bounds.firstNode();
    let last = bounds.lastNode();
    let node = first;
    while (node) {
        let next = node.nextSibling;
        parent.removeChild(node);
        if (node === last)
            return next;
        node = next;
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ycGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvaHRtbGJhcnMtcnVudGltZS9saWIvbW9ycGgudHMiXSwibmFtZXMiOlsiTW9ycGgiLCJNb3JwaC5jb25zdHJ1Y3RvciIsIk1vcnBoLnNwZWNpYWxpemUiLCJNb3JwaC5pbml0IiwiTW9ycGguYXBwZW5kIiwiTW9ycGgudXBkYXRlIiwiTW9ycGguZGVzdHJveSIsImNsZWFyIl0sIm1hcHBpbmdzIjoiQUFRQTtJQU9FQSxZQUFZQSxVQUFVQSxFQUFFQSxLQUFLQTtRQUMzQkMsSUFBSUEsQ0FBQ0EsS0FBS0EsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFFbkJBLDBCQUEwQkE7UUFDMUJBLElBQUlBLENBQUNBLFVBQVVBLEdBQUdBLFVBQVVBLENBQUNBLENBQUNBLDBCQUEwQkE7UUFDeERBLElBQUlBLENBQUNBLFdBQVdBLEdBQUdBLElBQUlBLENBQUNBO0lBQzFCQSxDQUFDQTtJQVpERCxPQUFPQSxVQUFVQSxLQUFpQkUsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFjaERGLElBQUlBLENBQUNBLE9BQWVBO1FBQ2xCRyxNQUFNQSxJQUFJQSxLQUFLQSxDQUFDQSwwQkFBMEJBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBLENBQUNBO0lBQ3JFQSxDQUFDQTtJQUVESDs7O01BR0VBO0lBQ0ZBLE1BQU1BLENBQUNBLEtBQW1CQTtRQUN4QkksTUFBTUEsSUFBSUEsS0FBS0EsQ0FBQ0EsNEJBQTRCQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxDQUFDQTtJQUN2RUEsQ0FBQ0E7SUFFREo7Ozs7OztNQU1FQTtJQUNGQSxNQUFNQTtRQUNKSyxNQUFNQSxJQUFJQSxLQUFLQSxDQUFDQSw0QkFBNEJBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBLENBQUNBO0lBQ3ZFQSxDQUFDQTtJQUVETDs7Ozs7Ozs7Ozs7TUFXRUE7SUFDRkEsT0FBT0E7UUFDTE0sTUFBTUEsSUFBSUEsS0FBS0EsQ0FBQ0EsNkJBQTZCQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxDQUFDQTtJQUN4RUEsQ0FBQ0E7QUFDSE4sQ0FBQ0E7QUFVRCxzQkFBc0IsTUFBYztJQUNsQ08sSUFBSUEsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0EsVUFBVUEsRUFBRUEsQ0FBQ0E7SUFDakNBLElBQUlBLEtBQUtBLEdBQUdBLE1BQU1BLENBQUNBLFNBQVNBLEVBQUVBLENBQUNBO0lBQy9CQSxJQUFJQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQTtJQUU3QkEsSUFBSUEsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7SUFFakJBLE9BQU9BLElBQUlBLEVBQUVBLENBQUNBO1FBQ1pBLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBO1FBQzVCQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtRQUN6QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0E7WUFBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7UUFDL0JBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBO0lBQ2RBLENBQUNBO0lBRURBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO0FBQ2RBLENBQUNBIn0=