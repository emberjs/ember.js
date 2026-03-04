# Autotracked Rendering

An explanation of the depths of the reactivity system we've been using and refining since Ember Octane (ember-source 3.13+).

### Walkthrough: setting a value

Given:
```gjs
import { tracked } from '@glimmer/tracking';

class ModuleState {
    @tracked count = 0;

    increment() {
        this.count++;
    }
}

const state = new ModuleState();

<template>
    <output>{{ state.count }}</output>
    <button {{on "click" state.increment}}>Increment</button>
</template>
```

And we 
1. observe a render, 
2. and then click the button,
   - and then observe the output count update.

How does it work?

There are a few systems at play for autotracking:
- [tags][^vm-tags]
- [global context][^ember-global-context]
- the environment / delegate
- some [glue code][^ember-renderer] that [configures][^ember-renderer-revalidate] the [timing specifics][^ember-renderer-render-transaction] of when to [render updates][^ember-renderer-render-roots]
- the actual [call to the VM to render][^ember-root-state-render]


[^vm-tags]: https://github.com/glimmerjs/glimmer-vm/blob/d86274816a21c61fbc82059006fe7687ca17dc7e/packages/%40glimmer/validator/lib/validators.ts#L1
[^ember-global-context]: https://github.com/emberjs/ember.js/blob/132b66a768a9cabd461908682ef331f35637d5e9/packages/%40ember/-internals/glimmer/lib/environment.ts#L21
[^ember-renderer]: https://github.com/emberjs/ember.js/blob/132b66a768a9cabd461908682ef331f35637d5e9/packages/%40ember/-internals/glimmer/lib/renderer.ts#L613C1-L614C1
[^ember-renderer-revalidate]: https://github.com/emberjs/ember.js/blob/132b66a768a9cabd461908682ef331f35637d5e9/packages/%40ember/-internals/glimmer/lib/renderer.ts#L626
[^ember-renderer-render-transaction]: https://github.com/emberjs/ember.js/blob/132b66a768a9cabd461908682ef331f35637d5e9/packages/%40ember/-internals/glimmer/lib/renderer.ts#L573
[^ember-renderer-render-roots]: https://github.com/emberjs/ember.js/blob/132b66a768a9cabd461908682ef331f35637d5e9/packages/%40ember/-internals/glimmer/lib/renderer.ts#L524
[^ember-root-state-render]: https://github.com/emberjs/ember.js/blob/132b66a768a9cabd461908682ef331f35637d5e9/packages/%40ember/-internals/glimmer/lib/renderer.ts#L156

#### 1. leading up to observing a render

- **render**
    - call `renderMain()` from glimmer-vm
        - this creates a [VM instance and a TemplateIterator](https://github.com/glimmerjs/glimmer-vm/blob/d86274816a21c61fbc82059006fe7687ca17dc7e/packages/%40glimmer/runtime/lib/render.ts#L59)
        - tell the [renderer to render](https://github.com/emberjs/ember.js/blob/132b66a768a9cabd461908682ef331f35637d5e9/packages/%40ember/-internals/glimmer/lib/renderer.ts#L165-L168)
            1. [executes the VM](https://github.com/glimmerjs/glimmer-vm/blob/d86274816a21c61fbc82059006fe7687ca17dc7e/packages/%40glimmer/runtime/lib/render.ts#L32)
            2. iterates over blocks / defers to [_execute](https://github.com/glimmerjs/glimmer-vm/blob/d86274816a21c61fbc82059006fe7687ca17dc7e/packages/%40glimmer/runtime/lib/vm/append.ts#L728)
            3. [evaluate opcodes](https://github.com/glimmerjs/glimmer-vm/blob/d86274816a21c61fbc82059006fe7687ca17dc7e/packages/%40glimmer/runtime/lib/vm/append.ts#L770)
            4. this brings us to the [low-level VM](https://github.com/glimmerjs/glimmer-vm/blob/main/packages/%40glimmer/runtime/lib/vm/low-level.ts#L167)
            5. the low-level VM is the actual VirtualMachine which inteprets all our opcodes -- it iterates until there are no more opcodes

- **read: count**
    - access `count`, which  `@tracked`'s getter [defers to `trackedData`](https://github.com/emberjs/ember.js/blob/132b66a768a9cabd461908682ef331f35637d5e9/packages/%40ember/-internals/metal/lib/tracked.ts#L155C28-L155C39)
        - the [`trackedData`](https://github.com/emberjs/ember.js/blob/132b66a768a9cabd461908682ef331f35637d5e9/packages/%40ember/-internals/metal/lib/tracked.ts#L5) is in `@glimmer/validator` instead of using tags _directly_.
            - `trackedData` calls `consumeTag` when [the value is access](https://github.com/glimmerjs/glimmer-vm/blob/main/packages/%40glimmer/validator/lib/tracked-data.ts#L15)
            - `consumeTag` adds the tag to the [`CURRENT_TRACKER`](https://github.com/glimmerjs/glimmer-vm/blob/main/packages/%40glimmer/validator/lib/tracking.ts#L116)
                - this is so that when any `{{ }}` regions of a template "detect" a dirty tag, they can individually re-render


    - [valueForRef](https://github.com/glimmerjs/glimmer-vm/blob/main/packages/%40glimmer/reference/lib/reference.ts#L155)
        - called by _many_ opcode handlers in the VM, in this case: [this APPEND_OPCODE](https://github.com/glimmerjs/glimmer-vm/blob/main/packages/%40glimmer/runtime/lib/compiled/opcodes/content.ts#L88) 
        - [track](https://github.com/glimmerjs/glimmer-vm/blob/main/packages/%40glimmer/validator/lib/tracking.ts#L232)
            - calls [beginTrackFrame](https://github.com/glimmerjs/glimmer-vm/blob/d86274816a21c61fbc82059006fe7687ca17dc7e/packages/%40glimmer/validator/lib/tracking.ts#L58) and the corresponding `endTrackFrame()`

- **render a button with modifier**
    - for demonstration purposes, this phase is skipped in this explanation, as this document is more about auto-tracking, and less so about how elements and event listeners get wired up

#### 2. click the button

- `increment()`
    - **read: count**
        - reading is part of `variable++` behavior
    - **set: count**
        - we dirty the tag [via `@tracked`'s setter](https://github.com/emberjs/ember.js/blob/132b66a768a9cabd461908682ef331f35637d5e9/packages/%40ember/-internals/metal/lib/tracked.ts#L171)
    
    - `scheduleRevalidate()` is called by `dirtyTag()`, which then defers to ember to call these things and interacts with the scheduler (we go back to step 1):
        - **env.begin**
        - **env.rerender**
        - **read: count**
        - **env.commit**

the output, `count` is rendered as `1`


### A minimal renderer

[JSBin, here](https://jsbin.com/mobupuh/edit?html,output)

> [!CAUTION]
> This is heavy in boilerplate, and mostly private API. This 300 line *minimal* example, should be considered our todo list, as having all this required to render a tiny component is _too much_.


