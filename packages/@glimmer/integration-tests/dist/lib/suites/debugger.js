var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { RenderTest } from '../render-test';
import { setDebuggerCallback } from '@glimmer/runtime';
import { test } from '../test-decorator';
export class DebuggerSuite extends RenderTest {
    'basic debugger statement'() {
        let expectedContext = {
            foo: 'bar',
            a: {
                b: true,
            },
        };
        let callbackExecuted = 0;
        setDebuggerCallback((context, get) => {
            callbackExecuted++;
            this.assert.equal(context.foo, expectedContext.foo);
            this.assert.equal(get('foo'), expectedContext.foo);
        });
        this.render('{{#if a.b}}true{{debugger}}{{else}}false{{debugger}}{{/if}}', expectedContext);
        this.assert.equal(callbackExecuted, 1);
        this.assertHTML('true');
        this.assertStableRerender();
        expectedContext = {
            foo: 'baz',
            a: {
                b: false,
            },
        };
        this.rerender(expectedContext);
        this.assert.equal(callbackExecuted, 2);
        this.assertHTML('false');
        this.assertStableNodes();
        expectedContext = {
            foo: 'bar',
            a: {
                b: true,
            },
        };
        this.rerender(expectedContext);
        this.assert.equal(callbackExecuted, 3);
        this.assertHTML('true');
        this.assertStableNodes();
    }
    'can get locals'() {
        let expectedContext = {
            foo: 'bar',
            a: {
                b: true,
            },
        };
        let callbackExecuted = 0;
        setDebuggerCallback((context, get) => {
            callbackExecuted++;
            this.assert.equal(get('foo'), expectedContext.foo);
            this.assert.equal(get('bar'), expectedContext.foo);
            this.assert.deepEqual(get('this'), context);
        });
        this.render('{{#with foo as |bar|}}{{#if a.b}}true{{debugger}}{{else}}false{{debugger}}{{/if}}{{/with}}', expectedContext);
        this.assert.equal(callbackExecuted, 1);
        this.assertHTML('true');
        this.assertStableRerender();
        expectedContext = {
            foo: 'baz',
            a: {
                b: false,
            },
        };
        this.rerender(expectedContext);
        this.assert.equal(callbackExecuted, 2);
        this.assertHTML('false');
        this.assertStableNodes();
        expectedContext = {
            foo: 'bar',
            a: {
                b: true,
            },
        };
        this.rerender(expectedContext);
        this.assert.equal(callbackExecuted, 3);
        this.assertHTML('true');
        this.assertStableNodes();
    }
}
DebuggerSuite.suiteName = 'Debugger';
__decorate([
    test
], DebuggerSuite.prototype, "basic debugger statement", null);
__decorate([
    test
], DebuggerSuite.prototype, "can get locals", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvc3VpdGVzL2RlYnVnZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM1QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFekMsTUFBTSxPQUFPLGFBQWMsU0FBUSxVQUFVO0lBSTNDLDBCQUEwQjtRQUN4QixJQUFJLGVBQWUsR0FBRztZQUNwQixHQUFHLEVBQUUsS0FBSztZQUNWLENBQUMsRUFBRTtnQkFDRCxDQUFDLEVBQUUsSUFBSTthQUNSO1NBQ0YsQ0FBQztRQUNGLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDO1FBRXpCLG1CQUFtQixDQUFDLENBQUMsT0FBWSxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3hDLGdCQUFnQixFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDcEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxNQUFNLENBQUMsNkRBQTZELEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDNUYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUU1QixlQUFlLEdBQUc7WUFDaEIsR0FBRyxF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ZXNDb250ZW50IjpbImltcG9ydCB7IFJlbmRlclRlc3QgfSBmcm9tICcuLi9yZW5kZXItdGVzdCc7XG5pbXBvcnQgeyBzZXREZWJ1Z2dlckNhbGxiYWNrIH0gZnJvbSAnQGdsaW1tZXIvcnVudGltZSc7XG5pbXBvcnQgeyB0ZXN0IH0gZnJvbSAnLi4vdGVzdC1kZWNvcmF0b3InO1xuXG5leHBvcnQgY2xhc3MgRGVidWdnZXJTdWl0ZSBleHRlbmRzIFJlbmRlclRlc3Qge1xuICBzdGF0aWMgc3VpdGVOYW1lID0gJ0RlYnVnZ2VyJztcblxuICBAdGVzdFxuICAnYmFzaWMgZGVidWdnZXIgc3RhdGVtZW50JygpIHtcbiAgICBsZXQgZXhwZWN0ZWRDb250ZXh0ID0ge1xuICAgICAgZm9vOiAnYmFyJyxcbiAgICAgIGE6IHtcbiAgICAgICAgYjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfTtcbiAgICBsZXQgY2FsbGJhY2tFeGVjdXRlZCA9IDA7XG5cbiAgICBzZXREZWJ1Z2dlckNhbGxiYWNrKChjb250ZXh0OiBhbnksIGdldCkgPT4ge1xuICAgICAgY2FsbGJhY2tFeGVjdXRlZCsrO1xuICAgICAgdGhpcy5hc3NlcnQuZXF1YWwoY29udGV4dC5mb28sIGV4cGVjdGVkQ29udGV4dC5mb28pO1xuICAgICAgdGhpcy5hc3NlcnQuZXF1YWwoZ2V0KCdmb28nKSwgZXhwZWN0ZWRDb250ZXh0LmZvbyk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnJlbmRlcigne3sjaWYgYS5ifX10cnVle3tkZWJ1Z2dlcn19e3tlbHNlfX1mYWxzZXt7ZGVidWdnZXJ9fXt7L2lmfX0nLCBleHBlY3RlZENvbnRleHQpO1xuICAgIHRoaXMuYXNzZXJ0LmVxdWFsKGNhbGxiYWNrRXhlY3V0ZWQsIDEpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgndHJ1ZScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIGV4cGVjdGVkQ29udGV4dCA9IHtcbiAgICAgIGZvbzogJ2JheicsXG4gICAgICBhOiB7XG4gICAgICAgIGI6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9O1xuICAgIHRoaXMucmVyZW5kZXIoZXhwZWN0ZWRDb250ZXh0KTtcbiAgICB0aGlzLmFzc2VydC5lcXVhbChjYWxsYmFja0V4ZWN1dGVkLCAyKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJ2ZhbHNlJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgZXhwZWN0ZWRDb250ZXh0ID0ge1xuICAgICAgZm9vOiAnYmFyJyxcbiAgICAgIGE6IHtcbiAgICAgICAgYjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfTtcbiAgICB0aGlzLnJlcmVuZGVyKGV4cGVjdGVkQ29udGV4dCk7XG4gICAgdGhpcy5hc3NlcnQuZXF1YWwoY2FsbGJhY2tFeGVjdXRlZCwgMyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCd0cnVlJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ2NhbiBnZXQgbG9jYWxzJygpIHtcbiAgICBsZXQgZXhwZWN0ZWRDb250ZXh0ID0ge1xuICAgICAgZm9vOiAnYmFyJyxcbiAgICAgIGE6IHtcbiAgICAgICAgYjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfTtcbiAgICBsZXQgY2FsbGJhY2tFeGVjdXRlZCA9IDA7XG5cbiAgICBzZXREZWJ1Z2dlckNhbGxiYWNrKChjb250ZXh0OiBhbnksIGdldCkgPT4ge1xuICAgICAgY2FsbGJhY2tFeGVjdXRlZCsrO1xuICAgICAgdGhpcy5hc3NlcnQuZXF1YWwoZ2V0KCdmb28nKSwgZXhwZWN0ZWRDb250ZXh0LmZvbyk7XG4gICAgICB0aGlzLmFzc2VydC5lcXVhbChnZXQoJ2JhcicpLCBleHBlY3RlZENvbnRleHQuZm9vKTtcbiAgICAgIHRoaXMuYXNzZXJ0LmRlZXBFcXVhbChnZXQoJ3RoaXMnKSwgY29udGV4dCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnJlbmRlcihcbiAgICAgICd7eyN3aXRoIGZvbyBhcyB8YmFyfH19e3sjaWYgYS5ifX10cnVle3tkZWJ1Z2dlcn19e3tlbHNlfX1mYWxzZXt7ZGVidWdnZXJ9fXt7L2lmfX17ey93aXRofX0nLFxuICAgICAgZXhwZWN0ZWRDb250ZXh0XG4gICAgKTtcbiAgICB0aGlzLmFzc2VydC5lcXVhbChjYWxsYmFja0V4ZWN1dGVkLCAxKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJ3RydWUnKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICBleHBlY3RlZENvbnRleHQgPSB7XG4gICAgICBmb286ICdiYXonLFxuICAgICAgYToge1xuICAgICAgICBiOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfTtcbiAgICB0aGlzLnJlcmVuZGVyKGV4cGVjdGVkQ29udGV4dCk7XG4gICAgdGhpcy5hc3NlcnQuZXF1YWwoY2FsbGJhY2tFeGVjdXRlZCwgMik7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCdmYWxzZScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIGV4cGVjdGVkQ29udGV4dCA9IHtcbiAgICAgIGZvbzogJ2JhcicsXG4gICAgICBhOiB7XG4gICAgICAgIGI6IHRydWUsXG4gICAgICB9LFxuICAgIH07XG4gICAgdGhpcy5yZXJlbmRlcihleHBlY3RlZENvbnRleHQpO1xuICAgIHRoaXMuYXNzZXJ0LmVxdWFsKGNhbGxiYWNrRXhlY3V0ZWQsIDMpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgndHJ1ZScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcbiAgfVxufVxuIl19