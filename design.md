```ts
renderComponent({ manager: GlimmerManager, definition: Tab, handle: 11 })
```

```hbs
{{! Inside <Tab> }}
<TabBar />
```

```ts
ambientManager.getComponentDefinition(Tab /* ComponentDefinition */, 12)
```

---

What the user types:

```ts
import TabBar from './TabBar';
class Tab extends Component {
  static template = hbs`<TabBar />`;
}
```

Pass 1:

```ts
import TabBar from './TabBar';
class Tab extends Component {
  static template = hbs({ moduleId: 'ui/components/Tab' })`<TabBar />`;
}
```

Pass 2 (against the entire bundle):

```ts
import TabBar from './TabBar';
class Tab extends Component {
  static capabilities = DEFAULT_CAPABILITIES;
  static template = 11 /* Handle */;
  static templates = {
    12: { definition: TabBar, manager: GlimmerManager /* statically determined (maybe pragma) */ }
  }
}
```

Handle 11:

```asm
                ; assume an ambient manager
getstate 12     ; state.manager.getComponentDefinition(state.definition, 12)
                ; populates the state register
invokecomponent
```

---

> Note, in all cases, invokecomponent expects a populated state register with
> { definition, manager, component: null } and a Handle on the stack

What the user types:

```hbs
{{! inside Tab }}
<TabBar />
```

We generate:

```json
['component', 'TabBar', { moduleId: 'ui/components/Tab' }]
```

Lazy compiler, today:

```asm
lookup 'TabBar', { moduleId: 'ui/components/Tab' }
;      ^ string const ^ template meta constant
resolve    ; -> { definition: ComponentDefinition, manager: Manager }
setstate   ; { manager: definition.manager, definition, component: null }
getlayout  ; definition.manager.getLayout(definition, env.resolver) ->
           ; resolver.lookup({ type: 'template', name: moduleId })
           ; -> CompilableLayout
compile    ; -> Handle
invokecomponent
```

Eager compiler, plan:

```asm
push 'ui/components/Tab/TabBar'
resolve       ; env.resolver.resolve('ui/components/Tab/TabBar')
              ; { manager: GlimmerManager, definition: TabBar }
setstate      ; { manager, definition, component: null }
pushhandle 12
invokecomponent
```

Tom Mode, plan:

```asm
                ; assume an ambient manager
getcomponent 12 ; state.manager.getComponentDefinition(state.definition, 12)
                ; tomManager.getComponentDefinition(Tab, 12) ->
                ; { manager: GlimmerManager, definition: TabBar }
getstate 12     ; populates the state register

pushhandle 12
invokecomponent
```

```
env.resolver.lookupComponent('TabBar', { moduleId: 'ui/components/Tab' }) -> Specifier -> resolve() -> Definition
Definition { ComponentClass: TabBar, manager: GlimmerManager }

{{component someComponent}}
['component', ['lookup', ['get', 0, 'someComponent']]]

locals: { TabBar: Handle, TabBody: Handle }
globals: { Tab: Handle }

globals { Tab: CompilableTemplate }
(name: string, meta: TemplateMeta) => CompilableTemplate

lookup("Tab") -> locals["Tab"] || globals["Tab"]

{ manager: 'glimmer' } -> manager = lookupManager('glimmer') -> manager.getComponentDefinition('Tab', templateMeta)

class extends Component {
  static capabilities = ...;
  static template = hbs`...`;
}

class extends Component {
  static capabilities = ...;
  static template = hbs({ moduleId: ... })`...`;
}
```
