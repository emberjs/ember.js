# Status

HTMLBars is still very much a work in progress. At the moment,
the parser does not have any special logic for void tags (`<img>`)
or special contexts (`<table>`).

I'll keep this section updated as it progresses.

# Goals

The goals of HTMLBars are to have a compiler for Handlebars that
builds a DOM rather than a String.

This means that helpers can have special behavior based on their
context (they know if they are inside an `<a>` tag, inside an
attribute, etc.)

Ultimately, the goal is to have a good data binding setup for
Handlebars that can work directly against DOM nodes and doesn't
need special tags in the String for the data binding code can
find (a major limitation in Ember).

# Usage

The main way to use HTMLBars is to override the `RESOLVE` and
`RESOLVE_IN_ATTR` helpers:

```javascript
HTMLBars.registerHelper('RESOLVE', function(parts, options) {
	var prop = parts.join("."),
			context = this,
			parent = options.element,
			text = document.createTextNode(context.get(prop));

	addObserver(this, prop, function() {
		var newNode = document.createTextNode(context.get(prop));
		parent.insertBefore(newNode, text);
		text = newNode;
	});

	parent.appendChild(text);
});
```

In this example, `RESOLVE` is overridden to insert a text node
for the current property path, and to add an observer so that
the text node can be replaced when the property path changes.

This is an intentionally simplistic example:

* It doesn't cover cleaning up the observer, which would probably
  be managed by the view layer of a system like Backbone or Ember
* It doesn't cover unescaped content. If `options.escaped` is
  false, this code would want to create and update a
	`DocumentFragment` instead of a `TextNode`.

That said, it offers the broad strokes of how to build data binding
with HTMLBars.

Helpers in content also receive `options.element`, so helpers can
also generate nodes and hold references to them for use later via
data binding approaches.

Attributes work similarly:

```javascript
HTMLBars.registerHelper('RESOLVE_IN_ATTR', function(parts, options) {
	var context = this,
			path = parts.join(".");

	addObserver(this, parts.join("."), function() {
		options.rerender();
	});

	return this.get(parts.join("."));
});
```

The main difference is that attributes cannot have separate
text nodes, so a change to any attribute lookup will need to
re-render the entire attribute value. The `options.rerender()`
method will re-execute the contents of the attribute and
update its value.

Helpers executed inside an attribute will also receive
`options.rerender`:

```handlebars
<a href="http://{{normalize-href url}}">{{title}}</a>
```

In this example, the `normalize-href` helper will get an
`options.rerender` that it can use to re-evaluate the
contents of `href` when the `url` changes.