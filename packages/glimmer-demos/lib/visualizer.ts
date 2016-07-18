import {
  TestEnvironment,
  TestDynamicScope
} from 'glimmer-test-helpers';
import { UpdatableReference } from 'glimmer-object-reference';

import { compileSpec } from 'glimmer-compiler';

import { EvaluatedArgs } from 'glimmer-runtime';

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
        },
        {
          "type": "Home",
          "number": "(555) 123 4567"
        },
        {
          "type": "Mobile",
          "number": "(555) 555 5555"
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
    <div>
      <a class="url fn n" href="{{@person.url}}">
      {{#with @person.name as |name|}}
        <span class="given-name">{{name.first}}</span>
        {{#if name.middle}}
        <span class="additional-name">{{name.middle}}</span>
        {{/if}}
        <span class="family-name">{{name.last}}</span>
      {{/with}}
      </a>
    </div>
  {{else}}
    <div>
      {{#with @person.name as |name|}}
        <span class="given-name">{{name.first}}</span>
        {{#if name.additional}}
        <span class="additional-name">{{name.middle}}</span>
        {{/if}}
        <span class="family-name">{{name.last}}</span>
      {{/with}}
    </div>
  {{/if}}
  {{#if @person.org}}
    <div class="org">{{@person.org}}</div>
  {{/if}}
  {{#if @person.email}}
    <div>
      <a class="email" href="mailto:{{@person.email}}">
        {{@person.email}}
      </a>
    </div>
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
  {{#each @person.phones key="type" as |phone|}}
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
  <button id="btn-edit" style="display: {{if rendered 'block' 'none'}}">Edit</button>
  <button id="btn-reset">Reset</button>
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
      <div class="content">
        <h3>Opcodes</h3>
        <ol>
          {{#each template.opcodes key="guid" as |opcode|}}
            <opcode-inspector opcode={{opcode}} />
          {{/each}}
        </ol>
      </div>
      <div class="header secondary">Opcodes (&lt;h-card&gt;)</div>
      <div class="content">
        <h3>Opcodes</h3>
        <ol>
          {{#each layout.opcodes key="guid" as |opcode|}}
            <opcode-inspector opcode={{opcode}} />
          {{/each}}
        </ol>
      </div>
    </div>
    <div id="updating">
      <div class="header">Updating Opcodes</div>
      <div class="content full-height">
        <h3>Opcodes</h3>
        <ol>
          {{#each updatingOpcodes key="guid" as |opcode|}}
            <opcode-inspector opcode={{opcode}} />
          {{/each}}
        </ol>
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

let $inputs:   Element,
    $data:     HTMLTextAreaElement,
    $template: HTMLTextAreaElement,
    $layout:   HTMLTextAreaElement,
    $render:   Element,
    $update:   Element,
    $edit:     Element,
    $reset:    Element;

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

  env.registerHelper("json", ([value]) => JSON.stringify(value));

  env.registerEmberishGlimmerComponent("wire-format-inspector", null,
`<div>
  <h3>Statements</h3>
  <ol>
    {{#each @spec.statements key="@index" as |statement|}}
      <li><span class="pre">{{json statement}}</span></li>
    {{/each}}
  </ol>
  <hr />
  {{#if @spec.locals}}
    <h3>Locals</h3>
    <ol>
      {{#each @spec.locals key="@index" as |local|}}
        <li><span class="pre">{{json local}}</span></li>
      {{/each}}
    </ol>
    <hr />
  {{/if}}
  {{#if @spec.named}}
    <h3>Named</h3>
    <ol>
      {{#each @spec.named key="@index" as |name|}}
        <li><span class="pre">{{json name}}</span></li>
      {{/each}}
    </ol>
    <hr />
  {{/if}}
  {{#if @spec.yields}}
    <h3>Yields</h3>
    <ol>
      {{#each @spec.yields key="@index" as |yield|}}
        <li><span class="pre">{{json yield}}</span></li>
      {{/each}}
    </ol>
    <hr />
  {{/if}}
  {{#if @spec.blocks}}
    <h3>Blocks</h3>
    <ol>
      {{#each @spec.blocks key="@index" as |block|}}
        <li>
          <h3>Block</h3>
          {{wire-format-inspector spec=block}}
        </li>
      {{/each}}
    </ol>
  {{/if}}
</div>`);

  env.registerHelper("pp-opcode", ([opcode]) => {
    let output = opcode.type.toUpperCase();

    if (opcode.args || opcode.details) {
      output += "(";

      if (opcode.args && opcode.args.length) {
        output += opcode.args.join(", ");
      }

      if (opcode.details) {
        let keys = Object.keys(opcode.details);

        if (keys.length) {
          if (opcode.args && opcode.args.length) {
            output += ", ";
          }

          output += keys.map(key => `${key}=${opcode.details[key]}`).join(", ");;
        }
      }

      output += ")";
    }

    return output;
  });

  env.registerEmberishGlimmerComponent("opcode-inspector", null,
`<li>
  <span class="pre">{{pp-opcode @opcode}}</span>
  {{#if @opcode.children}}
    <ol>
      {{#each @opcode.children key="guid" as |opcode|}}
        {{opcode-inspector opcode=opcode}}
      {{/each}}
    </ol>
  {{/if}}
</li>`);

  env.begin();
  let self = new UpdatableReference(ui);
  let res = env.compile(UI).render(self, env, { appendTo: document.body, dynamicScope: new TestDynamicScope(null) });
  env.commit();

  rerenderUI = () => {
    self.update(ui);
    res.rerender();
  };
}

function bindUI() {
  $inputs   = document.querySelectorAll("#inputs")[0];
  $data     = <HTMLTextAreaElement>document.querySelectorAll("#data")[0];
  $template = <HTMLTextAreaElement>document.querySelectorAll("#top-level-template")[0];
  $layout   = <HTMLTextAreaElement>document.querySelectorAll("#component-layout")[0];
  $render   = document.querySelectorAll("#btn-render")[0];
  $update   = document.querySelectorAll("#btn-update")[0];
  $edit    = document.querySelectorAll("#btn-edit")[0];
  $reset    = document.querySelectorAll("#btn-reset")[0];
}

function wireUI() {
  $render.addEventListener("click", renderContent, false);
  $update.addEventListener("click", updateContent, false);
  $edit.addEventListener("click", editContent, false);
  $reset.addEventListener("click", resetContent, false);

  $data.addEventListener("input", storeContent);
  $template.addEventListener("input", storeContent);
  $layout.addEventListener("input", storeContent);

  initContent();
}

function initContent() {
  let { data, template, layout } = getInitialContent();
  $data.value = data;
  $template.value = template;
  $layout.value = layout;
}

let _updateContent = null;

function renderContent() {
  let data = JSON.parse($data.value);

  let env = new TestEnvironment();

  env.registerHelper('foo', function(){
    return 'FOOOOOOO';
  });
  env.registerEmberishGlimmerComponent("h-card", null, $layout.value);

  let app = env.compile($template.value);

  function compileLayout(component) {
    let definition = env.getComponentDefinition([component]);

    let manager = definition.manager;
    let instance = manager.create(definition, EvaluatedArgs.empty(), new TestDynamicScope(null), false);
    let compiled = manager.layoutFor(definition, instance, env);

    return processOpcodes(compiled.ops);
  }

  function processOpcodes(list) {
    return list.toArray().map(op => {
      let json = op.toJSON();

      if (op.block) {
        json.children = processOpcodes(op.block.compile(env).ops);
      } else {
        json.children = [];
      }

      return json;
    });
  }

  function processUpdatingOpcodes(list) {
    return list.toArray().map(op => op.toJSON());
  }

  let div = document.createElement('div');

  env.begin();
  let self = new UpdatableReference(data);
  let res = app.render(self, env, { appendTo: div, dynamicScope: new TestDynamicScope(null) });
  env.commit();

  ui.rendered = true;

  ui.template.source = $template.value;
  ui.template.wireFormat = JSON.parse(compileSpec($template.value, {}));
  ui.template.opcodes = processOpcodes(app.raw['compiled'].ops);

  ui.layout.source = $layout.value;
  ui.layout.wireFormat = JSON.parse(compileSpec($layout.value, {}));
  ui.layout.opcodes = compileLayout("h-card");

  ui.updatingOpcodes = processUpdatingOpcodes(res['updating']);

  ui.html = div.innerHTML;

  window['$UI'] = ui;
  window['$DIV'] = div;

  _updateContent = () => {
    self.update(JSON.parse($data.value));
    res.rerender();
    ui.updatingOpcodes = processUpdatingOpcodes(res['updating']);
    ui.html = div.innerHTML;
    rerenderUI();
  };

  rerenderUI();
}

function updateContent() {
  _updateContent();
}

function editContent() {
  _updateContent = null;
  ui.rendered = false;
  rerenderUI();
}

function getInitialContent() {
  return getStoredContent() || {
    data: DEFAULT_DATA,
    template: DEFAULT_TEMPLATE,
    layout: DEFAULT_LAYOUT
  };
}

function getStoredContent() {
  let content = localStorage.getItem('glimmer-visualizer:content');
  if (content) {
    return JSON.parse(content);
  }
}

function storeContent() {
  localStorage.setItem('glimmer-visualizer:content', JSON.stringify({
    data: $data.value,
    template: $template.value,
    layout: $layout.value
  }));
}

function resetContent() {
  $data.value = DEFAULT_DATA;
  $template.value = DEFAULT_TEMPLATE;
  $layout.value = DEFAULT_LAYOUT;

  storeContent();
  editContent();
}
