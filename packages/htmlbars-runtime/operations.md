The Glimmer engine defines a series of operations that you can use to
build up an HTML document.

```ts
interface Block {
  open(tagName: string);
  attr(name: string, value: string, namespace?: string);
  prop(name: string, value: any);
  text(text: string);
  comment(value: string);
  close();

  dynamicText(text: Reference<string>)
  dynamicHTML(html: Reference<string>)
  dynamicAttr(name: string, value: Reference<string>, namespace?: string)
  dynamicProp(name: string, value: Reference<any>)
  dynamicCall(func: (block: Block, params: Reference<any>[]), params: Reference<any>[])

  openBlock() : Block;
  closeBlock();
}

interface Region {
  begin(): Block;
  commit();
}
```

## An Example

```js
let template = new Glimmer();
let obj = { first: "Yehuda", last: "Katz" };
let root = RootReference(obj);

template.open("div");
template.attr("title", "hover over me!");
template.text("Such templates!");
template.open("p");
template.dynamicText(root.path('first'));
template.text(' ');
template.dynamicText(root.path('last'));
template.close();
template.close();

let result = template.render(document.body);

// the body now contains:
// <div title="hover over me">Such templates<p>Yehuda Katz</p></div>

obj.update({ first: "Godfrey", last: "Chan" });

result.rerender();

// the body now contains:
// <div title="hover over me">Such templates<p>Godfrey Chan</p></div>
```

Note that the result contains just pointers to the two dynamic areas, so
calling rerender simply checks `isDirty()` on the two references and
updates the dynamic content if necessary.

## Blocks

To allow you to represent entire areas of your template that can change,
Glimmer supports the concepts of blocks. This can be used to help you
represent conditional areas, for example.

```js
let template = new Glimmer();
let obj = { first: "Yehuda", last: "Katz", isAdmin: true };
let root = RootReference(obj);
let isAdmin = root.path('isAdmin'):

template.open("div");
let block = template.openBlock();
block.dynamicCall(ifAdmin, [isAdmin]);
template.closeBlock();
template.open("p");
template.text("hello");
template.close("p");
template.close("div");

let result = template.render(document.body);

function ifAdmin(block, [conditional]) {
  if (conditional.value()) {
    block.open("div");
    block.text("Very admin");
    block.close();
  }
}
```

After the initial render, the body will contain:

```html
<div><div>Very admin</div><p>hello</p></div>
```

The `dynamicCall` receives a function and a list of references. The
function will be reinvoked any time any of the references

You could change the root and rerender:

```js
root.update({ first: "Godfrey", last: "Chan", isAdmin: false });
```

And now, the body contains:

```html
<div><p>hello</p></div>
```

## Glimmer Templates

Writing all of this out long-hand can get pretty tedious, so Glimmer comes with a templating engine that it will compile into a series of operations.

> It would also be possible to write a DSL to handle the open and close repetition, but HTML already has a DSL: HTML!

Going back to our very first example:

```js
template.open("div");
template.attr("title", "hover over me!");
template.text("Such templates!");
template.open("p");
template.dynamicText(root.path('first'));
template.text(' ');
template.dynamicText(root.path('last'));
template.close();
template.close();
```

You could write this template:

```hbs
<div title="hover over me!">Such templates!<p>{{first}} {{last}}</p></div>
```

## Scope Management

You render a compiled template by giving it a **Scope** and **Environment** to work with.

```js
let template = compile("<div>{{first}} {{last}}</div>");
let scope = new Scope();
let environment = new Environment();

scope.bindSelf({ first: "Yehuda", last: "Katz" });

let result = template.render(scope, new Environment(), { appendTo: document.body });
```

The body will now contain:

```html
<div>Yehuda Katz</div>
```

You can update the scope and `rerender()` the result:

```js
scope.updateSelf({ first: "Godfrey", last: "Chan" });
result.rerender();
```

Now, the body contains:

```html
<div>Godfrey Chan</div>
```

## Scope API

```ts
interface Scope {
  // control the main "self" context
  bindSelf(self: any);
  updateSelf(self: any);

  // control the scope's local variables (for block arguments)
  bindLocal(name: string, value: any);
  updateLocal(name: string, value: any);

  // create a child scope
  child(localNames: string[]): Scope;

  // used by Glimmer to resolve paths
  getRoot(name: string): Reference<any>;
  getLocal(name: string): Reference<any>;
}
```

## Conditionals

The Glimmer templating engine also has a dedicated syntax for blocks that you can use to register block handlers.

Let's go back to our conditional example:

```js
let template = new Glimmer();
let obj = { first: "Yehuda", last: "Katz", isAdmin: true };
let root = RootReference(obj);
let isAdmin = root.path('isAdmin'):

template.open("div");
let block = template.openBlock();
block.dynamicCall(ifAdmin, [isAdmin]);
template.closeBlock();
template.open("p");
template.text("hello");
template.close("p");
template.close("div");

let result = template.render(document.body);

function ifAdmin(block, [conditional]) {
  if (conditional.value()) {
    block.open("div");
    block.text("Very admin");
    block.close();
  }
}
```

We could write this template:

```hbs
<div>{{#if isAdmin}}<div>Very admin</div>{{/if}}<p>{{first}} {{last}}</p></div>
```

We'll need a way to register the `if` handler with Glimmer, but first let's write it:

```js
function ifHandler({ params: [conditional], blocks }) {
  if (conditional.value()) {
    blocks.default.yield();
  }
}
```

When we instantiate the environment, we'll give it a helper lookup function:

```js
let scope = new Scope();
scope.bindSelf({ first: "Yehuda", last: "Katz", isAdmin: true });

let envronment = new Environment({
  getBlockHandler(scope, handlerName) {
    if (handlerName === 'if') { return ifHandler; }

    throw new Error(`Block handler ${handlerName} not found");
  }
});

let result = template.render(scope, environment, { appendTo: document.body });
```

The body now contains:

```html
<div><div>Very admin</div><p>Yehuda Katz</p></div>
```

And we can update the scope and rerender:

```js
scope.updateSelf({ first: "Godfrey", last: "Chan", isAdmin: false });
```

The body now contains:

```html
<div><p>Godfrey Chan</p></div>
```
