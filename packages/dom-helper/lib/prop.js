export function isAttrRemovalValue(value) {
    return value === null || value === undefined;
}
/*
 *
 * @method normalizeProperty
 * @param element {HTMLElement}
 * @param slotName {String}
 * @returns {Object} { name, type }
 */
export function normalizeProperty(element, slotName) {
    var type, normalized;
    if (slotName in element) {
        normalized = slotName;
        type = 'prop';
    }
    else {
        var lower = slotName.toLowerCase();
        if (lower in element) {
            type = 'prop';
            normalized = lower;
        }
        else {
            type = 'attr';
            normalized = slotName;
        }
    }
    if (type === 'prop' &&
        (normalized.toLowerCase() === 'style' ||
            preferAttr(element.tagName, normalized))) {
        type = 'attr';
    }
    return { normalized, type };
}
// properties that MUST be set as attributes, due to:
// * browser bug
// * strange spec outlier
var ATTR_OVERRIDES = {
    // phantomjs < 2.0 lets you set it as a prop but won't reflect it
    // back to the attribute. button.getAttribute('type') === null
    BUTTON: { type: true, form: true },
    INPUT: {
        // TODO: remove when IE8 is droped
        // Some versions of IE (IE8) throw an exception when setting
        // `input.list = 'somestring'`:
        // https://github.com/emberjs/ember.js/issues/10908
        // https://github.com/emberjs/ember.js/issues/11364
        list: true,
        // Some version of IE (like IE9) actually throw an exception
        // if you set input.type = 'something-unknown'
        type: true,
        form: true
    },
    // element.form is actually a legitimate readOnly property, that is to be
    // mutated, but must be mutated by setAttribute...
    SELECT: { form: true },
    OPTION: { form: true },
    TEXTAREA: { form: true },
    LABEL: { form: true },
    FIELDSET: { form: true },
    LEGEND: { form: true },
    OBJECT: { form: true }
};
function preferAttr(tagName, propName) {
    var tag = ATTR_OVERRIDES[tagName.toUpperCase()];
    return tag && tag[propName.toLowerCase()] || false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9kb20taGVscGVyL2xpYi9wcm9wLnRzIl0sIm5hbWVzIjpbImlzQXR0clJlbW92YWxWYWx1ZSIsIm5vcm1hbGl6ZVByb3BlcnR5IiwicHJlZmVyQXR0ciJdLCJtYXBwaW5ncyI6IkFBQUEsbUNBQW1DLEtBQUs7SUFDdENBLE1BQU1BLENBQUNBLEtBQUtBLEtBQUtBLElBQUlBLElBQUlBLEtBQUtBLEtBQUtBLFNBQVNBLENBQUNBO0FBQy9DQSxDQUFDQTtBQUNEOzs7Ozs7R0FNRztBQUNILGtDQUFrQyxPQUFPLEVBQUUsUUFBUTtJQUNqREMsSUFBSUEsSUFBSUEsRUFBRUEsVUFBVUEsQ0FBQ0E7SUFFckJBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLElBQUlBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO1FBQ3hCQSxVQUFVQSxHQUFHQSxRQUFRQSxDQUFDQTtRQUN0QkEsSUFBSUEsR0FBR0EsTUFBTUEsQ0FBQ0E7SUFDaEJBLENBQUNBO0lBQUNBLElBQUlBLENBQUNBLENBQUNBO1FBQ05BLElBQUlBLEtBQUtBLEdBQUdBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBO1FBQ25DQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxJQUFJQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNyQkEsSUFBSUEsR0FBR0EsTUFBTUEsQ0FBQ0E7WUFDZEEsVUFBVUEsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDckJBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBO1lBQ2RBLFVBQVVBLEdBQUdBLFFBQVFBLENBQUNBO1FBQ3hCQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVEQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxLQUFLQSxNQUFNQTtRQUNmQSxDQUFDQSxVQUFVQSxDQUFDQSxXQUFXQSxFQUFFQSxLQUFLQSxPQUFPQTtZQUNwQ0EsVUFBVUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsT0FBT0EsRUFBRUEsVUFBVUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDOUNBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBO0lBQ2hCQSxDQUFDQTtJQUVEQSxNQUFNQSxDQUFDQSxFQUFFQSxVQUFVQSxFQUFFQSxJQUFJQSxFQUFFQSxDQUFDQTtBQUM5QkEsQ0FBQ0E7QUFFRCxxREFBcUQ7QUFDckQsZ0JBQWdCO0FBQ2hCLHlCQUF5QjtBQUN6QixJQUFJLGNBQWMsR0FBRztJQUVuQixpRUFBaUU7SUFDakUsOERBQThEO0lBQzlELE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtJQUVsQyxLQUFLLEVBQUU7UUFDTCxrQ0FBa0M7UUFDbEMsNERBQTREO1FBQzVELCtCQUErQjtRQUMvQixtREFBbUQ7UUFDbkQsbURBQW1EO1FBQ25ELElBQUksRUFBRSxJQUFJO1FBQ1YsNERBQTREO1FBQzVELDhDQUE4QztRQUM5QyxJQUFJLEVBQUUsSUFBSTtRQUNWLElBQUksRUFBRSxJQUFJO0tBQ1g7SUFFRCx5RUFBeUU7SUFDekUsa0RBQWtEO0lBQ2xELE1BQU0sRUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDeEIsTUFBTSxFQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtJQUN4QixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3hCLEtBQUssRUFBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDeEIsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtJQUN4QixNQUFNLEVBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3hCLE1BQU0sRUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7Q0FDekIsQ0FBQztBQUVGLG9CQUFvQixPQUFPLEVBQUUsUUFBUTtJQUNuQ0MsSUFBSUEsR0FBR0EsR0FBR0EsY0FBY0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7SUFDaERBLE1BQU1BLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLENBQUNBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLElBQUlBLEtBQUtBLENBQUNBO0FBQ3JEQSxDQUFDQSJ9