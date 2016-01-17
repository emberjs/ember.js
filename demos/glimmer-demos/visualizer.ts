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

const UI =
`<div id="inputs" class="{{if rendered '' 'full-width'}}">
  <h1>
    <span style="font-size: 48px; color: rgb(238, 89, 57);">Glimmer</span>
    <span style="font-size: 40px; color: rgb(161, 63, 43);">Visualizer</span>
  </h1>

  <div class="input-group">
    <label for="data">Data</label>
    <textarea id="data" wrap="off">{{data}}</textarea>
  </div>

  <div class="input-group">
    <label for="top-level-template">Top-Level Template</label>
    <textarea id="top-level-template" wrap="off" readOnly={{if rendered true false}}>{{template.source}}</textarea>
  </div>

  <div class="input-group">
    <label for="component-layout">&lt;h-card&gt; Layout</label>
    <textarea id="component-layout" wrap="off" readOnly={{if rendered true false}}>{{layout.source}}</textarea>
  </div>

  <button id="btn-render" class="primary" style="display: {{if rendered 'none' 'block'}}">Render</button>
  <button id="btn-update" class="primary" style="display: {{if rendered 'block' 'none'}}">Update</button>
  <button id="btn-clear" style="display: {{if rendered 'block' 'none'}}">Clear</button>
</div>
{{#if rendered}}
  <div id="output">
    <div id="wire-format">
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
      <div class="content full-height">
        <h3>Opcodes</h3>
        <updating-opcodes-inspector opcodes={{updatingOpcodes}} />
      </div>
    </div>
    <div id="dom">
      <div class="header">DOM</div>
      <div class="content rendered">{{{html}}}</div>
      <div class="header secondary">HTML</div>
      <pre class="content secondary source">{{html}}</pre>
    </div>
  </div>
{{/if}}`;

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

let ui = {
  rendered: false,
  data: DEFAULT_DATA,
  template: {
    source: DEFAULT_TEMPLATE,
    wireFormat: null,
    opcodes: null
  },
  layout: {
    source: DEFAULT_LAYOUT,
    wireFormat: null,
    opcodes: null
  },
  updatingOpcodes: null,
  html: ""
};

export function init() {
  renderUI();
  bindUI();
  wireUI();
}

let rerenderUI;

function renderUI() {
  let env = new TestEnvironment();

  env.registerHelper("if", ([cond, yes, no]) => cond ? yes : no);

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

  env.begin();
  let res = env.compile(UI).render(ui, env, { appendTo: document.body });
  env.commit();

  rerenderUI = res.rerender.bind(res);
}

function bindUI() {
  $inputs   = $("#inputs")[0] as HTMLDivElement;
  $data     = $("#data")[0] as HTMLTextAreaElement;
  $template = $("#top-level-template")[0] as HTMLTextAreaElement;
  $layout   = $("#component-layout")[0] as HTMLTextAreaElement;
  $render   = $("#btn-render")[0] as HTMLButtonElement;
  $update   = $("#btn-update")[0] as HTMLButtonElement;
  $clear    = $("#btn-clear")[0] as HTMLButtonElement;
}

function wireUI() {
  $render.addEventListener("click", renderContent, false);
  $update.addEventListener("click", updateContent, false);
  $clear.addEventListener("click", clearContent, false);
}

let _updateContent = null;

function renderContent() {
  let data = JSON.parse($data.value);

  let env = new TestEnvironment();

  env.registerEmberishGlimmerComponent("h-card", null, $layout.value);

  let app = env.compile($template.value);

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

  let div = document.createElement('div');

  env.begin();
  let res = app.render(data, env, { appendTo: div });
  env.commit();

  ui.rendered = true;

  ui.template.source = $template.value;
  ui.template.wireFormat = JSON.parse(compileSpec($template.value));
  ui.template.opcodes = processOpcodes(app.raw);

  ui.layout.source = $layout.value;
  ui.layout.wireFormat = JSON.parse(compileSpec($layout.value));
  ui.layout.opcodes = processOpcodes(compileLayout("h-card"));

  ui.updatingOpcodes = processUpdatingOpcodes(res.updating);

  ui.html = div.innerHTML;

  _updateContent = () => {
    res.rerender(JSON.parse($data.value));
    ui.updatingOpcodes = processUpdatingOpcodes(res.updating);
    ui.html = div.innerHTML;
    rerenderUI();
  };

  rerenderUI();
}

function updateContent() {
  _updateContent();
}

function clearContent() {
  _updateContent = null;
  ui.rendered = false;
  rerenderUI();
}