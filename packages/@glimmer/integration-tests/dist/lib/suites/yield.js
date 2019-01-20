var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { RenderTest } from '../render-test';
import { test } from '../test-decorator';
export class YieldSuite extends RenderTest {
    yield() {
        this.render({
            layout: '{{#if @predicate}}Yes:{{yield @someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}',
            args: { predicate: 'activated', someValue: '42' },
            blockParams: ['result'],
            template: 'Hello{{result}}{{outer}}',
            else: 'Goodbye{{outer}}',
        }, { activated: true, outer: 'outer' });
        this.assertComponent('Yes:Hello42outer');
        this.assertStableRerender();
    }
    [`yield to "inverse"`]() {
        this.render({
            layout: '{{#if @predicate}}Yes:{{yield @someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}',
            args: { predicate: 'activated', someValue: '42' },
            blockParams: ['result'],
            template: 'Hello{{result}}{{outer}}',
            else: 'Goodbye{{outer}}',
        }, { activated: false, outer: 'outer' });
        this.assertComponent('No:Goodbyeouter');
        this.assertStableRerender();
    }
    [`yield to "else"`]() {
        this.render({
            layout: '{{#if @predicate}}Yes:{{yield @someValue}}{{else}}No:{{yield to="else"}}{{/if}}',
            args: { predicate: 'activated', someValue: '42' },
            blockParams: ['result'],
            template: 'Hello{{result}}{{outer}}',
            else: 'Goodbye{{outer}}',
        }, { activated: false, outer: 'outer' });
        this.assertComponent('No:Goodbyeouter');
        this.assertStableRerender();
    }
    'yielding to an non-existent block'() {
        this.render({
            layout: 'Before-{{yield}}-After',
        });
        this.assertComponent('Before--After');
        this.assertStableRerender();
    }
    'yielding a string and rendering its length'() {
        this.render({
            layout: `{{yield "foo"}}-{{yield ""}}`,
            blockParams: ['yielded'],
            template: '{{yielded}}-{{yielded.length}}',
        });
        this.assertComponent(`foo-3--0`);
        this.assertStableRerender();
    }
    'use a non-existent block param'() {
        this.render({
            layout: '{{yield someValue}}',
            args: { someValue: '42' },
            blockParams: ['val1', 'val2'],
            template: '{{val1}} - {{val2}}',
        });
        this.assertComponent('42 - ');
        this.assertStableRerender();
    }
    'block without properties'() {
        this.render({
            layout: 'In layout -- {{yield}}',
            template: 'In template',
        });
        this.assertComponent('In layout -- In template');
        this.assertStableRerender();
    }
    'yielding true'() {
        this.render({
            layout: `{{yield true}}`,
            blockParams: ['yielded'],
            template: '{{yielded}}-{{yielded.foo.bar}}',
        });
        this.assertComponent(`true-`);
        this.assertStableRerender();
    }
    'yielding false'() {
        this.render({
            layout: `{{yield false}}`,
            blockParams: ['yielded'],
            template: '{{yielded}}-{{yielded.foo.bar}}',
        });
        this.assertComponent(`false-`);
        this.assertStableRerender();
    }
    'yielding null'() {
        this.render({
            layout: `{{yield null}}`,
            blockParams: ['yielded'],
            template: '{{yielded}}-{{yielded.foo.bar}}',
        });
        this.assertComponent(`-`);
        this.assertStableRerender();
    }
    'yielding undefined'() {
        this.render({
            layout: `{{yield undefined}}`,
            blockParams: ['yielded'],
            template: '{{yielded}}-{{yielded.foo.bar}}',
        });
        this.assertComponent(`-`);
        this.assertStableRerender();
    }
    'yielding integers'() {
        this.render({
            layout: `{{yield 123}}`,
            blockParams: ['yielded'],
            template: '{{yielded}}-{{yielded.foo.bar}}',
        });
        this.assertComponent(`123-`);
        this.assertStableRerender();
    }
    'yielding floats'() {
        this.render({
            layout: `{{yield 123.45}}`,
            blockParams: ['yielded'],
            template: '{{yielded}}-{{yielded.foo.bar}}',
        });
        this.assertComponent(`123.45-`);
        this.assertStableRerender();
    }
    'yielding strings'() {
        this.render({
            layout: `{{yield "hello"}}`,
            blockParams: ['yielded'],
            template: '{{yielded}}-{{yielded.foo.bar}}',
        });
        this.assertComponent(`hello-`);
        this.assertStableRerender();
    }
    'yield inside a conditional on the component'() {
        this.render({
            layout: 'In layout -- {{#if @predicate}}{{yield}}{{/if}}',
            template: 'In template',
            args: { predicate: 'predicate' },
        }, { predicate: true });
        this.assertComponent('In layout -- In template', {});
        this.assertStableRerender();
        this.rerender({ predicate: false });
        this.assertComponent('In layout -- <!---->');
        this.assertStableNodes();
        this.rerender({ predicate: true });
        this.assertComponent('In layout -- In template');
        this.assertStableNodes();
    }
}
YieldSuite.suiteName = 'yield';
__decorate([
    test
], YieldSuite.prototype, "yield", null);
__decorate([
    test({
        skip: 'glimmer',
    })
], YieldSuite.prototype, `yield to "inverse"`, null);
__decorate([
    test({
        skip: 'glimmer',
    })
], YieldSuite.prototype, `yield to "else"`, null);
__decorate([
    test
], YieldSuite.prototype, "yielding to an non-existent block", null);
__decorate([
    test
], YieldSuite.prototype, "yielding a string and rendering its length", null);
__decorate([
    test({
        skip: 'glimmer',
    })
], YieldSuite.prototype, "use a non-existent block param", null);
__decorate([
    test
], YieldSuite.prototype, "block without properties", null);
__decorate([
    test
], YieldSuite.prototype, "yielding true", null);
__decorate([
    test
], YieldSuite.prototype, "yielding false", null);
__decorate([
    test
], YieldSuite.prototype, "yielding null", null);
__decorate([
    test
], YieldSuite.prototype, "yielding undefined", null);
__decorate([
    test
], YieldSuite.prototype, "yielding integers", null);
__decorate([
    test
], YieldSuite.prototype, "yielding floats", null);
__decorate([
    test
], YieldSuite.prototype, "yielding strings", null);
__decorate([
    test
], YieldSuite.prototype, "yield inside a conditional on the component", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieWllbGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvc3VpdGVzL3lpZWxkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM1QyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFekMsTUFBTSxPQUFPLFVBQVcsU0FBUSxVQUFVO0lBSXhDLEtBQUs7UUFDSCxJQUFJLENBQUMsTUFBTSxDQUNUO1lBQ0UsTUFBTSxFQUNKLG9GQUFvRjtZQUN0RixJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUU7WUFDakQsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDO1lBQ3ZCLFFBQVEsRUFBRSwwQkFBMEI7WUFDcEMsSUFBSSxFQUFFLGtCQUFrQjtTQUN6QixFQUNELEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQ3BDLENBQUM7UUFFRixJQUFJLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUtELENBQUMsb0JBQW9CLENBQUM7UUFDcEIsSUFBSSxDQUFDLE1BQU0sQ0FDVDtZQUNFLE1BQU0sRUFDSixvRkFBb0Y7WUFDdEYsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFO1lBQ2pELFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQztZQUN2QixRQUFRLEVBQUUsMEJBQTBCO1lBQ3BDLElBQUksRUFBRSxrQkFBa0I7U0FDekIsRUFDRCxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUNyQyxDQUFDO1FBRUYsSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFD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STtnREFVSjtBQUdEO0lBREMsSUFBSTsrQ0FVSjtBQUdEO0lBREMsSUFBSTtvREFVSjtBQUdEO0lBREMsSUFBSTttREFVSjtBQUdEO0lBREMsSUFBSTtpREFVSjtBQUdEO0lBREMsSUFBSTtrREFVSjtBQUdEO0lBREMsSUFBSTs2RUFxQkoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSZW5kZXJUZXN0IH0gZnJvbSAnLi4vcmVuZGVyLXRlc3QnO1xuaW1wb3J0IHsgdGVzdCB9IGZyb20gJy4uL3Rlc3QtZGVjb3JhdG9yJztcblxuZXhwb3J0IGNsYXNzIFlpZWxkU3VpdGUgZXh0ZW5kcyBSZW5kZXJUZXN0IHtcbiAgc3RhdGljIHN1aXRlTmFtZSA9ICd5aWVsZCc7XG5cbiAgQHRlc3RcbiAgeWllbGQoKSB7XG4gICAgdGhpcy5yZW5kZXIoXG4gICAgICB7XG4gICAgICAgIGxheW91dDpcbiAgICAgICAgICAne3sjaWYgQHByZWRpY2F0ZX19WWVzOnt7eWllbGQgQHNvbWVWYWx1ZX19e3tlbHNlfX1Obzp7e3lpZWxkIHRvPVwiaW52ZXJzZVwifX17ey9pZn19JyxcbiAgICAgICAgYXJnczogeyBwcmVkaWNhdGU6ICdhY3RpdmF0ZWQnLCBzb21lVmFsdWU6ICc0MicgfSxcbiAgICAgICAgYmxvY2tQYXJhbXM6IFsncmVzdWx0J10sXG4gICAgICAgIHRlbXBsYXRlOiAnSGVsbG97e3Jlc3VsdH19e3tvdXRlcn19JyxcbiAgICAgICAgZWxzZTogJ0dvb2RieWV7e291dGVyfX0nLFxuICAgICAgfSxcbiAgICAgIHsgYWN0aXZhdGVkOiB0cnVlLCBvdXRlcjogJ291dGVyJyB9XG4gICAgKTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdZZXM6SGVsbG80Mm91dGVyJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3Qoe1xuICAgIHNraXA6ICdnbGltbWVyJyxcbiAgfSlcbiAgW2B5aWVsZCB0byBcImludmVyc2VcImBdKCkge1xuICAgIHRoaXMucmVuZGVyKFxuICAgICAge1xuICAgICAgICBsYXlvdXQ6XG4gICAgICAgICAgJ3t7I2lmIEBwcmVkaWNhdGV9fVllczp7e3lpZWxkIEBzb21lVmFsdWV9fXt7ZWxzZX19Tm86e3t5aWVsZCB0bz1cImludmVyc2VcIn19e3svaWZ9fScsXG4gICAgICAgIGFyZ3M6IHsgcHJlZGljYXRlOiAnYWN0aXZhdGVkJywgc29tZVZhbHVlOiAnNDInIH0sXG4gICAgICAgIGJsb2NrUGFyYW1zOiBbJ3Jlc3VsdCddLFxuICAgICAgICB0ZW1wbGF0ZTogJ0hlbGxve3tyZXN1bHR9fXt7b3V0ZXJ9fScsXG4gICAgICAgIGVsc2U6ICdHb29kYnlle3tvdXRlcn19JyxcbiAgICAgIH0sXG4gICAgICB7IGFjdGl2YXRlZDogZmFsc2UsIG91dGVyOiAnb3V0ZXInIH1cbiAgICApO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ05vOkdvb2RieWVvdXRlcicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHtcbiAgICBza2lwOiAnZ2xpbW1lcicsXG4gIH0pXG4gIFtgeWllbGQgdG8gXCJlbHNlXCJgXSgpIHtcbiAgICB0aGlzLnJlbmRlcihcbiAgICAgIHtcbiAgICAgICAgbGF5b3V0OiAne3sjaWYgQHByZWRpY2F0ZX19WWVzOnt7eWllbGQgQHNvbWVWYWx1ZX19e3tlbHNlfX1Obzp7e3lpZWxkIHRvPVwiZWxzZVwifX17ey9pZn19JyxcbiAgICAgICAgYXJnczogeyBwcmVkaWNhdGU6ICdhY3RpdmF0ZWQnLCBzb21lVmFsdWU6ICc0MicgfSxcbiAgICAgICAgYmxvY2tQYXJhbXM6IFsncmVzdWx0J10sXG4gICAgICAgIHRlbXBsYXRlOiAnSGVsbG97e3Jlc3VsdH19e3tvdXRlcn19JyxcbiAgICAgICAgZWxzZTogJ0dvb2RieWV7e291dGVyfX0nLFxuICAgICAgfSxcbiAgICAgIHsgYWN0aXZhdGVkOiBmYWxzZSwgb3V0ZXI6ICdvdXRlcicgfVxuICAgICk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnTm86R29vZGJ5ZW91dGVyJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ3lpZWxkaW5nIHRvIGFuIG5vbi1leGlzdGVudCBibG9jaycoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAnQmVmb3JlLXt7eWllbGR9fS1BZnRlcicsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnQmVmb3JlLS1BZnRlcicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICd5aWVsZGluZyBhIHN0cmluZyBhbmQgcmVuZGVyaW5nIGl0cyBsZW5ndGgnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogYHt7eWllbGQgXCJmb29cIn19LXt7eWllbGQgXCJcIn19YCxcbiAgICAgIGJsb2NrUGFyYW1zOiBbJ3lpZWxkZWQnXSxcbiAgICAgIHRlbXBsYXRlOiAne3t5aWVsZGVkfX0te3t5aWVsZGVkLmxlbmd0aH19JyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KGBmb28tMy0tMGApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHtcbiAgICBza2lwOiAnZ2xpbW1lcicsXG4gIH0pXG4gICd1c2UgYSBub24tZXhpc3RlbnQgYmxvY2sgcGFyYW0nKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJ3t7eWllbGQgc29tZVZhbHVlfX0nLFxuICAgICAgYXJnczogeyBzb21lVmFsdWU6ICc0MicgfSxcbiAgICAgIGJsb2NrUGFyYW1zOiBbJ3ZhbDEnLCAndmFsMiddLFxuICAgICAgdGVtcGxhdGU6ICd7e3ZhbDF9fSAtIHt7dmFsMn19JyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCc0MiAtICcpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdibG9jayB3aXRob3V0IHByb3BlcnRpZXMnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJ0luIGxheW91dCAtLSB7e3lpZWxkfX0nLFxuICAgICAgdGVtcGxhdGU6ICdJbiB0ZW1wbGF0ZScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnSW4gbGF5b3V0IC0tIEluIHRlbXBsYXRlJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ3lpZWxkaW5nIHRydWUnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogYHt7eWllbGQgdHJ1ZX19YCxcbiAgICAgIGJsb2NrUGFyYW1zOiBbJ3lpZWxkZWQnXSxcbiAgICAgIHRlbXBsYXRlOiAne3t5aWVsZGVkfX0te3t5aWVsZGVkLmZvby5iYXJ9fScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudChgdHJ1ZS1gKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAneWllbGRpbmcgZmFsc2UnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogYHt7eWllbGQgZmFsc2V9fWAsXG4gICAgICBibG9ja1BhcmFtczogWyd5aWVsZGVkJ10sXG4gICAgICB0ZW1wbGF0ZTogJ3t7eWllbGRlZH19LXt7eWllbGRlZC5mb28uYmFyfX0nLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoYGZhbHNlLWApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICd5aWVsZGluZyBudWxsJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6IGB7e3lpZWxkIG51bGx9fWAsXG4gICAgICBibG9ja1BhcmFtczogWyd5aWVsZGVkJ10sXG4gICAgICB0ZW1wbGF0ZTogJ3t7eWllbGRlZH19LXt7eWllbGRlZC5mb28uYmFyfX0nLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoYC1gKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAneWllbGRpbmcgdW5kZWZpbmVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6IGB7e3lpZWxkIHVuZGVmaW5lZH19YCxcbiAgICAgIGJsb2NrUGFyYW1zOiBbJ3lpZWxkZWQnXSxcbiAgICAgIHRlbXBsYXRlOiAne3t5aWVsZGVkfX0te3t5aWVsZGVkLmZvby5iYXJ9fScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudChgLWApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICd5aWVsZGluZyBpbnRlZ2VycycoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiBge3t5aWVsZCAxMjN9fWAsXG4gICAgICBibG9ja1BhcmFtczogWyd5aWVsZGVkJ10sXG4gICAgICB0ZW1wbGF0ZTogJ3t7eWllbGRlZH19LXt7eWllbGRlZC5mb28uYmFyfX0nLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoYDEyMy1gKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAneWllbGRpbmcgZmxvYXRzJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6IGB7e3lpZWxkIDEyMy40NX19YCxcbiAgICAgIGJsb2NrUGFyYW1zOiBbJ3lpZWxkZWQnXSxcbiAgICAgIHRlbXBsYXRlOiAne3t5aWVsZGVkfX0te3t5aWVsZGVkLmZvby5iYXJ9fScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudChgMTIzLjQ1LWApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICd5aWVsZGluZyBzdHJpbmdzJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6IGB7e3lpZWxkIFwiaGVsbG9cIn19YCxcbiAgICAgIGJsb2NrUGFyYW1zOiBbJ3lpZWxkZWQnXSxcbiAgICAgIHRlbXBsYXRlOiAne3t5aWVsZGVkfX0te3t5aWVsZGVkLmZvby5iYXJ9fScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudChgaGVsbG8tYCk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ3lpZWxkIGluc2lkZSBhIGNvbmRpdGlvbmFsIG9uIHRoZSBjb21wb25lbnQnKCkge1xuICAgIHRoaXMucmVuZGVyKFxuICAgICAge1xuICAgICAgICBsYXlvdXQ6ICdJbiBsYXlvdXQgLS0ge3sjaWYgQHByZWRpY2F0ZX19e3t5aWVsZH19e3svaWZ9fScsXG4gICAgICAgIHRlbXBsYXRlOiAnSW4gdGVtcGxhdGUnLFxuICAgICAgICBhcmdzOiB7IHByZWRpY2F0ZTogJ3ByZWRpY2F0ZScgfSxcbiAgICAgIH0sXG4gICAgICB7IHByZWRpY2F0ZTogdHJ1ZSB9XG4gICAgKTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdJbiBsYXlvdXQgLS0gSW4gdGVtcGxhdGUnLCB7fSk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IHByZWRpY2F0ZTogZmFsc2UgfSk7XG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ0luIGxheW91dCAtLSA8IS0tLS0+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IHByZWRpY2F0ZTogdHJ1ZSB9KTtcbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnSW4gbGF5b3V0IC0tIEluIHRlbXBsYXRlJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuICB9XG59XG4iXX0=