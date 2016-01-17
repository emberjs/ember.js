import {
  TestEnvironment,
  EmberishCurlyComponent as CurlyComponent,
  EmberishGlimmerComponent as GlimmerComponent
} from 'glimmer-demos';

import { compileSpec } from 'glimmer-compiler';

const DEFAULT_DATA =
`{
  "contacts": [
    {
      "id": 1,
      "name": {
        "first": "John",
        "last": "Appleseed"
      },
      "org": "Apple Inc.",
      "email": "appleseed@apple.com",
      "address": {
        "street": "1 Infinite Loop",
        "city": "Cupertino",
        "state": "CA",
        "zip": 95014,
        "country": "USA"
      },
      "phones": [
        {
          "type": "Office",
          "number": "1 (800) MYAPPLE"
        }
      ]
    }
  ]
}`;

const DEFAULT_TEMPLATE =
`<div class="contacts">
  {{#each contacts key="id" as |contact|}}
    <h-card person={{contact}} />
    <hr />
  {{/each}}
</div>`;

const DEFAULT_LAYOUT =
`<div class="vcard">
  {{#if @person.url}}
    <a class="url fn n" href="{{@person.url}}">
    {{#with @person.name as |name|}}
      <span class="given-name">{{name.first}}</span>
      {{#if name.middle}}
      <span class="additional-name">{{name.middle}}</span>
      {{/if}}
      <span class="family-name">{{name.last}}</span>
    {{/with}}
    </a>
  {{else}}
    {{#with @person.name as |name|}}
      <span class="given-name">{{name.first}}</span>
      {{#if name.additional}}
      <span class="additional-name">{{name.middle}}</span>
      {{/if}}
      <span class="family-name">{{name.last}}</span>
    {{/with}}
  {{/if}}
  {{#if @person.org}}
    <div class="org">{{@person.org}}</div>
  {{/if}}
  {{#if @person.email}}
    <a class="email" href="mailto:{{@person.email}}">
      {{@person.email}}
    </a>
  {{/if}}
  {{#with @person.address as |address|}}
    <div class="adr">
      <span class="street-address">{{address.street}}</span>
      <br>
      <span class="locality">{{address.city}}</span>,
      <span class="region">{{address.state}}</span>
      <span class="postal-code">{{address.zip}}</span>
      <br>
      <span class="country-name">{{address.country}}</span>
    </div>
  {{/with}}
  {{#each @person.phones key="number" as |phone|}}
    <div class="tel">
      <span class="type">{{phone.type}}</span>:
      <span class="value">{{phone.number}}</span>
    </div>
  {{/each}}
</div>`;

function $(selector) {
  return document.querySelectorAll(selector);
}

let $inputs:   HTMLDivElement,
    $data:     HTMLTextAreaElement,
    $template: HTMLTextAreaElement,
    $layout:   HTMLTextAreaElement,
    $render:   HTMLButtonElement,
    $update:   HTMLButtonElement,
    $clear:    HTMLButtonElement,
    $output:   HTMLDivElement;

export function init() {
  bindUI();
  resetUI();
  wireUI();
}

function bindUI() {
  $inputs   = $("#inputs")[0] as HTMLDivElement;
  $data     = $("#data")[0] as HTMLTextAreaElement;
  $template = $("#top-level-template")[0] as HTMLTextAreaElement;
  $layout   = $("#component-layout")[0] as HTMLTextAreaElement;
  $render   = $("#btn-render")[0] as HTMLButtonElement;
  $update   = $("#btn-update")[0] as HTMLButtonElement;
  $clear    = $("#btn-clear")[0] as HTMLButtonElement;
  $output   = $("#output")[0] as HTMLDivElement;
}

function resetUI() {
  $output.innerHTML = "";
  $inputs.className = "full-width";
  $template.readOnly = false;
  $layout.readOnly = false;
  $render.style.display = "";
  $update.style.display = "none";
  $clear.style.display = "none";
}

function wireUI() {
  $data.value = DEFAULT_DATA;
  $template.value = DEFAULT_TEMPLATE;
  $layout.value = DEFAULT_LAYOUT;
  $render.addEventListener("click", render, false);
  $update.addEventListener("click", update, false);
  $clear.addEventListener("click", clear, false);
}

let _update = null;

function render() {
  let context = JSON.parse($data.value);

  let env = new TestEnvironment();

  env.registerEmberishGlimmerComponent("h-card", null, $layout.value);

  let ViewSource = CurlyComponent.extend({
    didInsertElement() {
      this.$rendered = $(`#vsr${this._guid}`)[0];
      this.$source = $(`#vss${this._guid}`)[0];
    },

    didRender() {
      if (this.attrs.unwrap) {
        this.$source.innerText = this.$rendered.children[0].innerHTML;
      } else {
        this.$source.innerText = this.$rendered.innerHTML;
      }
    }
  });

  env.registerEmberishCurlyComponent("view-source", ViewSource,
`<div class="header">DOM</div>
<div id="vsr{{_guid}}" class="content rendered">{{yield}}</div>
<div class="header secondary">HTML</div>
<pre id="vss{{_guid}}" class="content secondary source"></pre>`);

  let TopLevel = CurlyComponent.extend({
    willRender() {
      this.setProperties(this.attrs.context);
    }
  });

  env.registerEmberishCurlyComponent("top-level", TopLevel, $template.value);

  env.registerHelper("json", ([value]) => JSON.stringify(value));

  env.registerEmberishGlimmerComponent("wire-format-inspector", null,
`<div>
  <h3>Statements</h3>
  <ol>
    {{#each @spec.statements as |statement|}}
      <li><span class="pre">{{json statement}}</span></li>
    {{/each}}
  </ol>
  <hr />
  {{#if @spec.locals}}
    <h3>Locals</h3>
    <ol>
      {{#each @spec.locals as |local|}}
        <li><span class="pre">{{json local}}</span></li>
      {{/each}}
    </ol>
    <hr />
  {{/if}}
  {{#if @spec.named}}
    <h3>Named</h3>
    <ol>
      {{#each @spec.named as |name|}}
        <li><span class="pre">{{json name}}</span></li>
      {{/each}}
    </ol>
    <hr />
  {{/if}}
  {{#if @spec.yields}}
    <h3>Yields</h3>
    <ol>
      {{#each @spec.yields as |yield|}}
        <li><span class="pre">{{json yield}}</span></li>
      {{/each}}
    </ol>
    <hr />
  {{/if}}
  {{#if @spec.blocks}}
    <h3>Blocks</h3>
    <ol>
      {{#each @spec.blocks as |block|}}
        <li>
          <h3>Block</h3>
          {{wire-format-inspector spec=block}}
        </li>
      {{/each}}
    </ol>
  {{/if}}
</div>`);

  env.registerEmberishGlimmerComponent("opcodes-inspector", null,
`<div>
  <h3>Opcodes</h3>
  <ol>
    {{#each @block.opcodes as |opcode|}}
      <li><span class="pre">{{opcode.type}}</span></li>
    {{/each}}
  </ol>
  <hr />
  {{#each @block.children as |inner|}}
    <div class="indent">{{opcodes-inspector block=inner}}</div>
  {{/each}}
</div>`);

  env.registerEmberishGlimmerComponent("updating-opcodes-inspector", null,
`<ol>
  {{#each @opcodes as |opcode|}}
    <li>
      <span class="pre">{{opcode.type}}</span>
      {{#if opcode.children}}
        {{updating-opcodes-inspector opcodes=opcode.children}}
      {{/if}}
    </li>
  {{/each}}
</ol>`);

  let app = env.compile(
`<div id="wire-format">
  <div class="header">Wire Format (Top-Level)</div>
  <wire-format-inspector class="content" spec={{template.wireFormat}} />
  <div class="header secondary">Wire Format (&lt;h-card&gt;)</div>
  <wire-format-inspector class="content" spec={{layout.wireFormat}} />
</div>
<div id="initial">
  <div class="header">Opcodes (Top-Level)</div>
  <opcodes-inspector class="content" block={{template.opcodes}} />
  <div class="header secondary">Opcodes (&lt;h-card&gt;)</div>
  <opcodes-inspector class="content" block={{layout.opcodes}} />
</div>
<div id="updating">
  <div class="header">Updating Opcodes</div>
  {{#if updating}}
    <div class="content full-height">
      <h3>Opcodes</h3>
      <updating-opcodes-inspector opcodes={{updating}} />
    </div>
  {{/if}}
</div>
<div id="dom">
  {{#view-source unwrap=true}}{{top-level context=context}}{{/view-source}}
</div>`);

  function compileLayout(component) {
    let def = env.getComponentDefinition([component]);
    let layout = def.layout;
    layout.compile(def, env);
    layout.children.forEach(compileInner);
    return layout;
  }

  function compileInner(block) {
    block.compile(env);
    block.children.forEach(compileInner);
  }

  function processOpcodes(block) {
    return {
      opcodes: block.ops.toArray(),
      children: block.children.map(processOpcodes)
    };
  }

  function processUpdatingOpcodes(list) {
    return list.toArray().map(opcode => {
      let rtn = {
        type: opcode.type,
        children: null
      };

      if (opcode.updating) {
        rtn.children = processUpdatingOpcodes(opcode.updating);
      }

      return rtn;
    });
  }

  let template = {};

  template["wireFormat"] = JSON.parse(compileSpec($template.value));
  template["opcodes"] = processOpcodes(compileLayout("top-level"));

  let layout = {};

  layout["wireFormat"] = JSON.parse(compileSpec($layout.value));
  layout["opcodes"] = processOpcodes(compileLayout("h-card"));

  let self = { context, template, layout, updating: null };

  env.begin();
  let res = app.render(self, env, { appendTo: $output });
  env.commit();

  self.updating = processUpdatingOpcodes(res.updating);
  res.rerender();

  _update = () => {
    let context = JSON.parse($data.value);
    self.context = context;
    res.rerender();
    self.updating = processUpdatingOpcodes(res.updating);
    res.rerender();
  };

  $inputs.className = "";
  $template.readOnly = true;
  $layout.readOnly = true;
  $render.style.display = "none";
  $update.style.display = "";
  $clear.style.display = "";
}

function update() {
  _update();
}

function clear() {
  _update = null;
  resetUI();
}