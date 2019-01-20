var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { test } from '../test-decorator';
import { AbstractNodeTest } from '../modes/node/env';
export class ServerSideSuite extends AbstractNodeTest {
    'HTML text content'() {
        this.render('content');
        this.assertHTML('content');
    }
    'HTML tags'() {
        this.render('<h1>hello!</h1><div>content</div>');
        this.assertHTML('<h1>hello!</h1><div>content</div>');
    }
    'HTML tags re-rendered'() {
        this.render('<h1>hello!</h1><div>content</div>');
        this.assertHTML('<h1>hello!</h1><div>content</div>');
        this.rerender();
        this.assertHTML('<h1>hello!</h1><div>content</div>');
    }
    'HTML attributes'() {
        this.render("<div id='bar' class='foo'>content</div>");
        this.assertHTML('<div id="bar" class="foo">content</div>');
    }
    'HTML tag with empty attribute'() {
        this.render("<div class=''>content</div>");
        this.assertHTML('<div class>content</div>');
    }
    "HTML boolean attribute 'disabled'"() {
        this.render('<input disabled>');
        this.assertHTML('<input disabled>');
    }
    'Quoted attribute expression is removed when null'() {
        this.render('<input disabled="{{isDisabled}}">', { isDisabled: null });
        this.assertHTML('<input>');
    }
    'Unquoted attribute expression with null value is not coerced'() {
        this.render('<input disabled={{isDisabled}}>', { isDisabled: null });
        this.assertHTML('<input>');
    }
    'Attribute expression can be followed by another attribute'() {
        this.render('<div foo="{{funstuff}}" name="Alice"></div>', { funstuff: 'oh my' });
        this.assertHTML('<div foo="oh my" name="Alice"></div>');
    }
    'HTML tag with data- attribute'() {
        this.render("<div data-some-data='foo'>content</div>");
        this.assertHTML('<div data-some-data="foo">content</div>');
    }
    'The compiler can handle nesting'() {
        this.render('<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div>&nbsp;More content');
        // Note that the space after the closing div tag is a non-breaking space (Unicode 0xA0)
        this.assertHTML('<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div> More content');
    }
    'The compiler can handle comments'() {
        this.render('<div><!-- Just passing through --></div>');
        this.assertHTML('<div><!-- Just passing through --></div>');
    }
    'The compiler can handle HTML comments with mustaches in them'() {
        this.render('<div><!-- {{foo}} --></div>', { foo: 'bar' });
        this.assertHTML('<div><!-- {{foo}} --></div>');
    }
    'The compiler can handle HTML comments with complex mustaches in them'() {
        this.render('<div><!-- {{foo bar baz}} --></div>', { foo: 'bar' });
        this.assertHTML('<div><!-- {{foo bar baz}} --></div>');
    }
    'The compiler can handle HTML comments with multi-line mustaches in them'() {
        this.render('<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>', { foo: 'bar' });
        this.assertHTML('<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>');
    }
    'The compiler can handle comments with no parent element'() {
        this.render('<!-- {{foo}} -->', { foo: 'bar' });
        this.assertHTML('<!-- {{foo}} -->');
    }
    'The compiler can handle simple handlebars'() {
        this.render('<div>{{title}}</div>', { title: 'hello' });
        this.assertHTML('<div>hello</div>');
    }
    'The compiler can handle escaping HTML'() {
        this.render('<div>{{title}}</div>', { title: '<strong>hello</strong>' });
        this.assertHTML('<div>&lt;strong&gt;hello&lt;/strong&gt;</div>');
    }
    'The compiler can handle unescaped HTML'() {
        this.render('<div>{{{title}}}</div>', { title: '<strong>hello</strong>' });
        this.assertHTML('<div><strong>hello</strong></div>');
    }
    'Unescaped helpers render correctly'() {
        this.registerHelper('testing-unescaped', params => params[0]);
        this.render('{{{testing-unescaped "<span>hi</span>"}}}');
        this.assertHTML('<span>hi</span>');
    }
    'Null literals do not have representation in DOM'() {
        this.render('{{null}}');
        this.assertHTML('');
    }
    'Attributes can be populated with helpers that generate a string'() {
        this.registerHelper('testing', params => {
            return params[0];
        });
        this.render('<a href="{{testing url}}">linky</a>', { url: 'linky.html' });
        this.assertHTML('<a href="linky.html">linky</a>');
    }
    'Elements inside a yielded block'() {
        this.render('{{#if true}}<div id="test">123</div>{{/if}}');
        this.assertHTML('<div id="test">123</div>');
    }
    'A simple block helper can return text'() {
        this.render('{{#if true}}test{{else}}not shown{{/if}}');
        this.assertHTML('test');
    }
    'SVG: basic element'() {
        let template = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" height="100" width="100" style="stroke:#ff0000; fill: #0000ff"></rect>
      </svg>
    `;
        this.render(template);
        this.assertHTML(template);
    }
    'SVG: element with xlink:href'() {
        let template = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <rect x=".01" y=".01" width="4.98" height="2.98" fill="none" stroke="blue" stroke-width=".03"></rect>
        <a xlink:href="http://www.w3.org">
          <ellipse cx="2.5" cy="1.5" rx="2" ry="1" fill="red"></ellipse>
        </a>
      </svg>
    `;
        this.render(template);
        this.assertHTML(template);
    }
}
ServerSideSuite.suiteName = 'Server Side Rendering';
__decorate([
    test
], ServerSideSuite.prototype, "HTML text content", null);
__decorate([
    test
], ServerSideSuite.prototype, "HTML tags", null);
__decorate([
    test
], ServerSideSuite.prototype, "HTML tags re-rendered", null);
__decorate([
    test
], ServerSideSuite.prototype, "HTML attributes", null);
__decorate([
    test
], ServerSideSuite.prototype, "HTML tag with empty attribute", null);
__decorate([
    test
], ServerSideSuite.prototype, "HTML boolean attribute 'disabled'", null);
__decorate([
    test
], ServerSideSuite.prototype, "Quoted attribute expression is removed when null", null);
__decorate([
    test
], ServerSideSuite.prototype, "Unquoted attribute expression with null value is not coerced", null);
__decorate([
    test
], ServerSideSuite.prototype, "Attribute expression can be followed by another attribute", null);
__decorate([
    test
], ServerSideSuite.prototype, "HTML tag with data- attribute", null);
__decorate([
    test
], ServerSideSuite.prototype, "The compiler can handle nesting", null);
__decorate([
    test
], ServerSideSuite.prototype, "The compiler can handle comments", null);
__decorate([
    test
], ServerSideSuite.prototype, "The compiler can handle HTML comments with mustaches in them", null);
__decorate([
    test
], ServerSideSuite.prototype, "The compiler can handle HTML comments with complex mustaches in them", null);
__decorate([
    test
], ServerSideSuite.prototype, "The compiler can handle HTML comments with multi-line mustaches in them", null);
__decorate([
    test
], ServerSideSuite.prototype, "The compiler can handle comments with no parent element", null);
__decorate([
    test
], ServerSideSuite.prototype, "The compiler can handle simple handlebars", null);
__decorate([
    test
], ServerSideSuite.prototype, "The compiler can handle escaping HTML", null);
__decorate([
    test
], ServerSideSuite.prototype, "The compiler can handle unescaped HTML", null);
__decorate([
    test
], ServerSideSuite.prototype, "Unescaped helpers render correctly", null);
__decorate([
    test
], ServerSideSuite.prototype, "Null literals do not have representation in DOM", null);
__decorate([
    test
], ServerSideSuite.prototype, "Attributes can be populated with helpers that generate a string", null);
__decorate([
    test
], ServerSideSuite.prototype, "Elements inside a yielded block", null);
__decorate([
    test
], ServerSideSuite.prototype, "A simple block helper can return text", null);
__decorate([
    test
], ServerSideSuite.prototype, "SVG: basic element", null);
__decorate([
    test
], ServerSideSuite.prototype, "SVG: element with xlink:href", null);
export class ServerSideComponentSuite extends AbstractNodeTest {
    'can render components'() {
        this.render({
            layout: '<h1>Hello World!</h1>',
        });
        this.assertComponent('<h1>Hello World!</h1>');
    }
    'can render components with yield'() {
        this.render({
            layout: '<h1>Hello {{yield}}!</h1>',
            template: 'World',
        });
        this.assertComponent('<h1>Hello World!</h1>');
    }
    'can render components with args'() {
        this.render({
            layout: '<h1>Hello {{@place}}!</h1>',
            template: 'World',
            args: { place: 'place' },
        }, { place: 'World' });
        this.assertComponent('<h1>Hello World!</h1>');
    }
    'can render components with block params'() {
        this.render({
            layout: '<h1>Hello {{yield @place}}!</h1>',
            template: '{{place}}',
            args: { place: 'place' },
            blockParams: ['place'],
        }, { place: 'World' });
        this.assertComponent('<h1>Hello World!</h1>');
    }
}
ServerSideComponentSuite.suiteName = 'Server Side Components';
__decorate([
    test
], ServerSideComponentSuite.prototype, "can render components", null);
__decorate([
    test
], ServerSideComponentSuite.prototype, "can render components with yield", null);
__decorate([
    test
], ServerSideComponentSuite.prototype, "can render components with args", null);
__decorate([
    test
], ServerSideComponentSuite.prototype, "can render components with block params", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3NyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL3N1aXRlcy9zc3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3pDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRXJELE1BQU0sT0FBTyxlQUFnQixTQUFRLGdCQUFnQjtJQUluRCxtQkFBbUI7UUFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFHRCxXQUFXO1FBQ1QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxVQUFVLENBQUMsbUNBQW1DLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBR0QsdUJBQXVCO1FBQ3JCLElBQUksQ0FBQyxNQUFNLENBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsVUFBVSxDQUFDLG1DQUFtQyxDQUFDLENBQUM7UUFDckQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsbUNBQW1DLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBR0QsaUJBQWlCO1FBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxVQUFVLENBQUMseUNBQXlDLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBR0QsK0JBQStCO1FBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsVUFBVSxDQUFDLDBCQUEwQixDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUdELG1DQUFtQztRQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENB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QUFNLENBQUM7WUFDVixNQUFNLEVBQUUsMkJBQTJCO1lBQ25DLFFBQVEsRUFBRSxPQUFPO1NBQ2xCLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxlQUFlLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBR0QsaUNBQWlDO1FBQy9CLElBQUksQ0FBQyxNQUFNLENBQ1Q7WUFDRSxNQUFNLEVBQUUsNEJBQTRCO1lBQ3BDLFFBQVEsRUFBRSxPQUFPO1lBQ2pCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUU7U0FDekIsRUFDRCxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FDbkIsQ0FBQztRQUNGLElBQUksQ0FBQyxlQUFlLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBR0QseUNBQXlDO1FBQ3ZDLElBQUksQ0FBQyxNQUFNLENBQ1Q7WUFDRSxNQUFNLEVBQUUsa0NBQWtDO1lBQzFDLFFBQVEsRUFBRSxXQUFXO1lBQ3JCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUU7WUFDeEIsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDO1NBQ3ZCLEVBQ0QsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQ25CLENBQUM7UUFDRixJQUFJLENBQUMsZUFBZSxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDaEQsQ0FBQzs7QUE1Q00sa0NBQVMsR0FBRyx3QkFBd0IsQ0FBQztBQUc1QztJQURDLElBQUk7cUVBTUo7QUFHRDtJQURDLElBQUk7Z0ZBT0o7QUFHRDtJQURDLElBQUk7K0VBV0o7QUFHRDtJQURDLElBQUk7dUZBWUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB0ZXN0IH0gZnJvbSAnLi4vdGVzdC1kZWNvcmF0b3InO1xuaW1wb3J0IHsgQWJzdHJhY3ROb2RlVGVzdCB9IGZyb20gJy4uL21vZGVzL25vZGUvZW52JztcblxuZXhwb3J0IGNsYXNzIFNlcnZlclNpZGVTdWl0ZSBleHRlbmRzIEFic3RyYWN0Tm9kZVRlc3Qge1xuICBzdGF0aWMgc3VpdGVOYW1lID0gJ1NlcnZlciBTaWRlIFJlbmRlcmluZyc7XG5cbiAgQHRlc3RcbiAgJ0hUTUwgdGV4dCBjb250ZW50JygpIHtcbiAgICB0aGlzLnJlbmRlcignY29udGVudCcpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnY29udGVudCcpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0hUTUwgdGFncycoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzxoMT5oZWxsbyE8L2gxPjxkaXY+Y29udGVudDwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGgxPmhlbGxvITwvaDE+PGRpdj5jb250ZW50PC9kaXY+Jyk7XG4gIH1cblxuICBAdGVzdFxuICAnSFRNTCB0YWdzIHJlLXJlbmRlcmVkJygpIHtcbiAgICB0aGlzLnJlbmRlcignPGgxPmhlbGxvITwvaDE+PGRpdj5jb250ZW50PC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8aDE+aGVsbG8hPC9oMT48ZGl2PmNvbnRlbnQ8L2Rpdj4nKTtcbiAgICB0aGlzLnJlcmVuZGVyKCk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8aDE+aGVsbG8hPC9oMT48ZGl2PmNvbnRlbnQ8L2Rpdj4nKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdIVE1MIGF0dHJpYnV0ZXMnKCkge1xuICAgIHRoaXMucmVuZGVyKFwiPGRpdiBpZD0nYmFyJyBjbGFzcz0nZm9vJz5jb250ZW50PC9kaXY+XCIpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdiBpZD1cImJhclwiIGNsYXNzPVwiZm9vXCI+Y29udGVudDwvZGl2PicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0hUTUwgdGFnIHdpdGggZW1wdHkgYXR0cmlidXRlJygpIHtcbiAgICB0aGlzLnJlbmRlcihcIjxkaXYgY2xhc3M9Jyc+Y29udGVudDwvZGl2PlwiKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXYgY2xhc3M+Y29udGVudDwvZGl2PicpO1xuICB9XG5cbiAgQHRlc3RcbiAgXCJIVE1MIGJvb2xlYW4gYXR0cmlidXRlICdkaXNhYmxlZCdcIigpIHtcbiAgICB0aGlzLnJlbmRlcignPGlucHV0IGRpc2FibGVkPicpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGlucHV0IGRpc2FibGVkPicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1F1b3RlZCBhdHRyaWJ1dGUgZXhwcmVzc2lvbiBpcyByZW1vdmVkIHdoZW4gbnVsbCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzxpbnB1dCBkaXNhYmxlZD1cInt7aXNEaXNhYmxlZH19XCI+JywgeyBpc0Rpc2FibGVkOiBudWxsIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGlucHV0PicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1VucXVvdGVkIGF0dHJpYnV0ZSBleHByZXNzaW9uIHdpdGggbnVsbCB2YWx1ZSBpcyBub3QgY29lcmNlZCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzxpbnB1dCBkaXNhYmxlZD17e2lzRGlzYWJsZWR9fT4nLCB7IGlzRGlzYWJsZWQ6IG51bGwgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8aW5wdXQ+Jyk7XG4gIH1cblxuICBAdGVzdFxuICAnQXR0cmlidXRlIGV4cHJlc3Npb24gY2FuIGJlIGZvbGxvd2VkIGJ5IGFub3RoZXIgYXR0cmlidXRlJygpIHtcbiAgICB0aGlzLnJlbmRlcignPGRpdiBmb289XCJ7e2Z1bnN0dWZmfX1cIiBuYW1lPVwiQWxpY2VcIj48L2Rpdj4nLCB7IGZ1bnN0dWZmOiAnb2ggbXknIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdiBmb289XCJvaCBteVwiIG5hbWU9XCJBbGljZVwiPjwvZGl2PicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0hUTUwgdGFnIHdpdGggZGF0YS0gYXR0cmlidXRlJygpIHtcbiAgICB0aGlzLnJlbmRlcihcIjxkaXYgZGF0YS1zb21lLWRhdGE9J2Zvbyc+Y29udGVudDwvZGl2PlwiKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXYgZGF0YS1zb21lLWRhdGE9XCJmb29cIj5jb250ZW50PC9kaXY+Jyk7XG4gIH1cblxuICBAdGVzdFxuICAnVGhlIGNvbXBpbGVyIGNhbiBoYW5kbGUgbmVzdGluZycoKSB7XG4gICAgdGhpcy5yZW5kZXIoXG4gICAgICAnPGRpdiBjbGFzcz1cImZvb1wiPjxwPjxzcGFuIGlkPVwiYmFyXCIgZGF0YS1mb289XCJiYXJcIj5oaSE8L3NwYW4+PC9wPjwvZGl2PiZuYnNwO01vcmUgY29udGVudCdcbiAgICApO1xuXG4gICAgLy8gTm90ZSB0aGF0IHRoZSBzcGFjZSBhZnRlciB0aGUgY2xvc2luZyBkaXYgdGFnIGlzIGEgbm9uLWJyZWFraW5nIHNwYWNlIChVbmljb2RlIDB4QTApXG4gICAgdGhpcy5hc3NlcnRIVE1MKFxuICAgICAgJzxkaXYgY2xhc3M9XCJmb29cIj48cD48c3BhbiBpZD1cImJhclwiIGRhdGEtZm9vPVwiYmFyXCI+aGkhPC9zcGFuPjwvcD48L2Rpdj7CoE1vcmUgY29udGVudCdcbiAgICApO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1RoZSBjb21waWxlciBjYW4gaGFuZGxlIGNvbW1lbnRzJygpIHtcbiAgICB0aGlzLnJlbmRlcignPGRpdj48IS0tIEp1c3QgcGFzc2luZyB0aHJvdWdoIC0tPjwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj48IS0tIEp1c3QgcGFzc2luZyB0aHJvdWdoIC0tPjwvZGl2PicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1RoZSBjb21waWxlciBjYW4gaGFuZGxlIEhUTUwgY29tbWVudHMgd2l0aCBtdXN0YWNoZXMgaW4gdGhlbScoKSB7XG4gICAgdGhpcy5yZW5kZXIoJzxkaXY+PCEtLSB7e2Zvb319IC0tPjwvZGl2PicsIHsgZm9vOiAnYmFyJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+PCEtLSB7e2Zvb319IC0tPjwvZGl2PicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1RoZSBjb21waWxlciBjYW4gaGFuZGxlIEhUTUwgY29tbWVudHMgd2l0aCBjb21wbGV4IG11c3RhY2hlcyBpbiB0aGVtJygpIHtcbiAgICB0aGlzLnJlbmRlcignPGRpdj48IS0tIHt7Zm9vIGJhciBiYXp9fSAtLT48L2Rpdj4nLCB7IGZvbzogJ2JhcicgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2PjwhLS0ge3tmb28gYmFyIGJhen19IC0tPjwvZGl2PicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1RoZSBjb21waWxlciBjYW4gaGFuZGxlIEhUTUwgY29tbWVudHMgd2l0aCBtdWx0aS1saW5lIG11c3RhY2hlcyBpbiB0aGVtJygpIHtcbiAgICB0aGlzLnJlbmRlcignPGRpdj48IS0tIHt7I2VhY2ggZm9vIGFzIHxiYXJ8fX1cXG57e2Jhcn19XFxuXFxue3svZWFjaH19IC0tPjwvZGl2PicsIHsgZm9vOiAnYmFyJyB9KTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj48IS0tIHt7I2VhY2ggZm9vIGFzIHxiYXJ8fX1cXG57e2Jhcn19XFxuXFxue3svZWFjaH19IC0tPjwvZGl2PicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1RoZSBjb21waWxlciBjYW4gaGFuZGxlIGNvbW1lbnRzIHdpdGggbm8gcGFyZW50IGVsZW1lbnQnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8IS0tIHt7Zm9vfX0gLS0+JywgeyBmb286ICdiYXInIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPCEtLSB7e2Zvb319IC0tPicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1RoZSBjb21waWxlciBjYW4gaGFuZGxlIHNpbXBsZSBoYW5kbGViYXJzJygpIHtcbiAgICB0aGlzLnJlbmRlcignPGRpdj57e3RpdGxlfX08L2Rpdj4nLCB7IHRpdGxlOiAnaGVsbG8nIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj5oZWxsbzwvZGl2PicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1RoZSBjb21waWxlciBjYW4gaGFuZGxlIGVzY2FwaW5nIEhUTUwnKCkge1xuICAgIHRoaXMucmVuZGVyKCc8ZGl2Pnt7dGl0bGV9fTwvZGl2PicsIHsgdGl0bGU6ICc8c3Ryb25nPmhlbGxvPC9zdHJvbmc+JyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+Jmx0O3N0cm9uZyZndDtoZWxsbyZsdDsvc3Ryb25nJmd0OzwvZGl2PicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1RoZSBjb21waWxlciBjYW4gaGFuZGxlIHVuZXNjYXBlZCBIVE1MJygpIHtcbiAgICB0aGlzLnJlbmRlcignPGRpdj57e3t0aXRsZX19fTwvZGl2PicsIHsgdGl0bGU6ICc8c3Ryb25nPmhlbGxvPC9zdHJvbmc+JyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxkaXY+PHN0cm9uZz5oZWxsbzwvc3Ryb25nPjwvZGl2PicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1VuZXNjYXBlZCBoZWxwZXJzIHJlbmRlciBjb3JyZWN0bHknKCkge1xuICAgIHRoaXMucmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmctdW5lc2NhcGVkJywgcGFyYW1zID0+IHBhcmFtc1swXSk7XG4gICAgdGhpcy5yZW5kZXIoJ3t7e3Rlc3RpbmctdW5lc2NhcGVkIFwiPHNwYW4+aGk8L3NwYW4+XCJ9fX0nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzxzcGFuPmhpPC9zcGFuPicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ051bGwgbGl0ZXJhbHMgZG8gbm90IGhhdmUgcmVwcmVzZW50YXRpb24gaW4gRE9NJygpIHtcbiAgICB0aGlzLnJlbmRlcigne3tudWxsfX0nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJycpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0F0dHJpYnV0ZXMgY2FuIGJlIHBvcHVsYXRlZCB3aXRoIGhlbHBlcnMgdGhhdCBnZW5lcmF0ZSBhIHN0cmluZycoKSB7XG4gICAgdGhpcy5yZWdpc3RlckhlbHBlcigndGVzdGluZycsIHBhcmFtcyA9PiB7XG4gICAgICByZXR1cm4gcGFyYW1zWzBdO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZW5kZXIoJzxhIGhyZWY9XCJ7e3Rlc3RpbmcgdXJsfX1cIj5saW5reTwvYT4nLCB7IHVybDogJ2xpbmt5Lmh0bWwnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGEgaHJlZj1cImxpbmt5Lmh0bWxcIj5saW5reTwvYT4nKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdFbGVtZW50cyBpbnNpZGUgYSB5aWVsZGVkIGJsb2NrJygpIHtcbiAgICB0aGlzLnJlbmRlcigne3sjaWYgdHJ1ZX19PGRpdiBpZD1cInRlc3RcIj4xMjM8L2Rpdj57ey9pZn19Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2IGlkPVwidGVzdFwiPjEyMzwvZGl2PicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0Egc2ltcGxlIGJsb2NrIGhlbHBlciBjYW4gcmV0dXJuIHRleHQnKCkge1xuICAgIHRoaXMucmVuZGVyKCd7eyNpZiB0cnVlfX10ZXN0e3tlbHNlfX1ub3Qgc2hvd257ey9pZn19Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCd0ZXN0Jyk7XG4gIH1cblxuICBAdGVzdFxuICAnU1ZHOiBiYXNpYyBlbGVtZW50JygpIHtcbiAgICBsZXQgdGVtcGxhdGUgPSBgXG4gICAgICA8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbiAgICAgICAgPHJlY3QgeD1cIjEwXCIgeT1cIjEwXCIgaGVpZ2h0PVwiMTAwXCIgd2lkdGg9XCIxMDBcIiBzdHlsZT1cInN0cm9rZTojZmYwMDAwOyBmaWxsOiAjMDAwMGZmXCI+PC9yZWN0PlxuICAgICAgPC9zdmc+XG4gICAgYDtcbiAgICB0aGlzLnJlbmRlcih0ZW1wbGF0ZSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKHRlbXBsYXRlKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdTVkc6IGVsZW1lbnQgd2l0aCB4bGluazpocmVmJygpIHtcbiAgICBsZXQgdGVtcGxhdGUgPSBgXG4gICAgICA8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB4bWxuczp4bGluaz1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIj5cbiAgICAgICAgPHJlY3QgeD1cIi4wMVwiIHk9XCIuMDFcIiB3aWR0aD1cIjQuOThcIiBoZWlnaHQ9XCIyLjk4XCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCJibHVlXCIgc3Ryb2tlLXdpZHRoPVwiLjAzXCI+PC9yZWN0PlxuICAgICAgICA8YSB4bGluazpocmVmPVwiaHR0cDovL3d3dy53My5vcmdcIj5cbiAgICAgICAgICA8ZWxsaXBzZSBjeD1cIjIuNVwiIGN5PVwiMS41XCIgcng9XCIyXCIgcnk9XCIxXCIgZmlsbD1cInJlZFwiPjwvZWxsaXBzZT5cbiAgICAgICAgPC9hPlxuICAgICAgPC9zdmc+XG4gICAgYDtcbiAgICB0aGlzLnJlbmRlcih0ZW1wbGF0ZSk7XG5cbiAgICB0aGlzLmFzc2VydEhUTUwodGVtcGxhdGUpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTZXJ2ZXJTaWRlQ29tcG9uZW50U3VpdGUgZXh0ZW5kcyBBYnN0cmFjdE5vZGVUZXN0IHtcbiAgc3RhdGljIHN1aXRlTmFtZSA9ICdTZXJ2ZXIgU2lkZSBDb21wb25lbnRzJztcblxuICBAdGVzdFxuICAnY2FuIHJlbmRlciBjb21wb25lbnRzJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICc8aDE+SGVsbG8gV29ybGQhPC9oMT4nLFxuICAgIH0pO1xuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCc8aDE+SGVsbG8gV29ybGQhPC9oMT4nKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdjYW4gcmVuZGVyIGNvbXBvbmVudHMgd2l0aCB5aWVsZCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAnPGgxPkhlbGxvIHt7eWllbGR9fSE8L2gxPicsXG4gICAgICB0ZW1wbGF0ZTogJ1dvcmxkJyxcbiAgICB9KTtcbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnPGgxPkhlbGxvIFdvcmxkITwvaDE+Jyk7XG4gIH1cblxuICBAdGVzdFxuICAnY2FuIHJlbmRlciBjb21wb25lbnRzIHdpdGggYXJncycoKSB7XG4gICAgdGhpcy5yZW5kZXIoXG4gICAgICB7XG4gICAgICAgIGxheW91dDogJzxoMT5IZWxsbyB7e0BwbGFjZX19ITwvaDE+JyxcbiAgICAgICAgdGVtcGxhdGU6ICdXb3JsZCcsXG4gICAgICAgIGFyZ3M6IHsgcGxhY2U6ICdwbGFjZScgfSxcbiAgICAgIH0sXG4gICAgICB7IHBsYWNlOiAnV29ybGQnIH1cbiAgICApO1xuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCc8aDE+SGVsbG8gV29ybGQhPC9oMT4nKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdjYW4gcmVuZGVyIGNvbXBvbmVudHMgd2l0aCBibG9jayBwYXJhbXMnKCkge1xuICAgIHRoaXMucmVuZGVyKFxuICAgICAge1xuICAgICAgICBsYXlvdXQ6ICc8aDE+SGVsbG8ge3t5aWVsZCBAcGxhY2V9fSE8L2gxPicsXG4gICAgICAgIHRlbXBsYXRlOiAne3twbGFjZX19JyxcbiAgICAgICAgYXJnczogeyBwbGFjZTogJ3BsYWNlJyB9LFxuICAgICAgICBibG9ja1BhcmFtczogWydwbGFjZSddLFxuICAgICAgfSxcbiAgICAgIHsgcGxhY2U6ICdXb3JsZCcgfVxuICAgICk7XG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJzxoMT5IZWxsbyBXb3JsZCE8L2gxPicpO1xuICB9XG59XG4iXX0=