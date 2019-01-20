var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { PrimitiveReference } from '@glimmer/runtime';
import { RenderTest, Count } from '../render-test';
import { test } from '../test-decorator';
import { AotRenderDelegate } from '../modes/aot/delegate';
export class EntryPointTest extends RenderTest {
    constructor() {
        super(...arguments);
        this.count = new Count();
    }
    'an entry point'() {
        let delegate = new AotRenderDelegate();
        delegate.registerComponent('Basic', 'Basic', 'Title', `<h1>hello {{@title}}</h1>`);
        let element = delegate.getInitialElement();
        let title = PrimitiveReference.create('renderComponent');
        delegate.renderComponent('Title', { title }, element);
        QUnit.assert.equal(element.innerHTML, '<h1>hello renderComponent</h1>');
    }
    'does not leak args between invocations'() {
        let delegate = new AotRenderDelegate();
        delegate.registerComponent('Basic', 'Basic', 'Title', `<h1>hello {{@title}}</h1>`);
        let element = delegate.getInitialElement();
        let title = PrimitiveReference.create('renderComponent');
        delegate.renderComponent('Title', { title }, element);
        QUnit.assert.equal(element.innerHTML, '<h1>hello renderComponent</h1>');
        element = delegate.getInitialElement();
        let newTitle = PrimitiveReference.create('new title');
        delegate.renderComponent('Title', { title: newTitle }, element);
        QUnit.assert.equal(element.innerHTML, '<h1>hello new title</h1>');
    }
    'can render different components per call'() {
        let delegate = new AotRenderDelegate();
        delegate.registerComponent('Basic', 'Basic', 'Title', `<h1>hello {{@title}}</h1>`);
        delegate.registerComponent('Basic', 'Basic', 'Body', `<p>body {{@body}}</p>`);
        let element = delegate.getInitialElement();
        let title = PrimitiveReference.create('renderComponent');
        delegate.renderComponent('Title', { title }, element);
        QUnit.assert.equal(element.innerHTML, '<h1>hello renderComponent</h1>');
        element = delegate.getInitialElement();
        let body = PrimitiveReference.create('text');
        delegate.renderComponent('Body', { body }, element);
        QUnit.assert.equal(element.innerHTML, '<p>body text</p>');
    }
}
EntryPointTest.suiteName = 'entry points';
__decorate([
    test
], EntryPointTest.prototype, "an entry point", null);
__decorate([
    test
], EntryPointTest.prototype, "does not leak args between invocations", null);
__decorate([
    test
], EntryPointTest.prototype, "can render different components per call", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnktcG9pbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvc3VpdGVzL2VudHJ5LXBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFbkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTFELE1BQU0sT0FBTyxjQUFlLFNBQVEsVUFBVTtJQUE5Qzs7UUFLVyxVQUFLLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztJQThDL0IsQ0FBQztJQTNDQyxnQkFBZ0I7UUFDZCxJQUFJLFFBQVEsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDdkMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLDJCQUEyQixDQUFDLENBQUM7UUFFbkYsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDM0MsSUFBSSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDekQsUUFBUSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUV0RCxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBRSxPQUFtQixDQUFDLFNBQVMsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO0lBQ3ZGLENBQUM7SUFHRCx3Q0FBd0M7UUFDdEMsSUFBSSxRQUFRLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ3ZDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1FBRW5GLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzNDLElBQUksS0FBSyxHQUFHLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3pELFFBQVEsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDdEQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUUsT0FBbUIsQ0FBQyxTQUFTLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztRQUVyRixPQUFPLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDdkMsSUFBSSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3RELFFBQVEsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2hFLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFFLE9BQW1CLENBQUMsU0FBUyxFQUFFLDBCQUEwQixDQUFDLENBQUM7SUFDakYsQ0FBQztJQUdELDBDQUEwQztRQUN4QyxJQUFJLFFBQVEsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDdkMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLDJCQUEyQixDQUFDLENBQUM7UUFDbkYsUUFBUSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFFOUUsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDM0MsSUFBSSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDekQsUUFBUSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RCxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBRSxPQUFtQixDQUFDLFNBQVMsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO1FBRXJGLE9BQU8sR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUN2QyxJQUFJLElBQUksR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDN0MsUUFBUSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNwRCxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBRSxPQUFtQixDQUFDLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7O0FBakRNLHdCQUFTLEdBQUcsY0FBYyxDQUFDO0FBT2xDO0lBREMsSUFBSTtvREFVSjtBQUdEO0lBREMsSUFBSTs0RUFjSjtBQUdEO0lBREMsSUFBSTs4RUFlSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFByaW1pdGl2ZVJlZmVyZW5jZSB9IGZyb20gJ0BnbGltbWVyL3J1bnRpbWUnO1xuaW1wb3J0IHsgUmVuZGVyVGVzdCwgQ291bnQgfSBmcm9tICcuLi9yZW5kZXItdGVzdCc7XG5pbXBvcnQgeyBDb21wb25lbnRLaW5kIH0gZnJvbSAnLi4vY29tcG9uZW50cy90eXBlcyc7XG5pbXBvcnQgeyB0ZXN0IH0gZnJvbSAnLi4vdGVzdC1kZWNvcmF0b3InO1xuaW1wb3J0IHsgQW90UmVuZGVyRGVsZWdhdGUgfSBmcm9tICcuLi9tb2Rlcy9hb3QvZGVsZWdhdGUnO1xuXG5leHBvcnQgY2xhc3MgRW50cnlQb2ludFRlc3QgZXh0ZW5kcyBSZW5kZXJUZXN0IHtcbiAgc3RhdGljIHN1aXRlTmFtZSA9ICdlbnRyeSBwb2ludHMnO1xuXG4gIHJlYWRvbmx5IHRlc3RUeXBlITogQ29tcG9uZW50S2luZDtcblxuICByZWFkb25seSBjb3VudCA9IG5ldyBDb3VudCgpO1xuXG4gIEB0ZXN0XG4gICdhbiBlbnRyeSBwb2ludCcoKSB7XG4gICAgbGV0IGRlbGVnYXRlID0gbmV3IEFvdFJlbmRlckRlbGVnYXRlKCk7XG4gICAgZGVsZWdhdGUucmVnaXN0ZXJDb21wb25lbnQoJ0Jhc2ljJywgJ0Jhc2ljJywgJ1RpdGxlJywgYDxoMT5oZWxsbyB7e0B0aXRsZX19PC9oMT5gKTtcblxuICAgIGxldCBlbGVtZW50ID0gZGVsZWdhdGUuZ2V0SW5pdGlhbEVsZW1lbnQoKTtcbiAgICBsZXQgdGl0bGUgPSBQcmltaXRpdmVSZWZlcmVuY2UuY3JlYXRlKCdyZW5kZXJDb21wb25lbnQnKTtcbiAgICBkZWxlZ2F0ZS5yZW5kZXJDb21wb25lbnQoJ1RpdGxlJywgeyB0aXRsZSB9LCBlbGVtZW50KTtcblxuICAgIFFVbml0LmFzc2VydC5lcXVhbCgoZWxlbWVudCBhcyBFbGVtZW50KS5pbm5lckhUTUwsICc8aDE+aGVsbG8gcmVuZGVyQ29tcG9uZW50PC9oMT4nKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdkb2VzIG5vdCBsZWFrIGFyZ3MgYmV0d2VlbiBpbnZvY2F0aW9ucycoKSB7XG4gICAgbGV0IGRlbGVnYXRlID0gbmV3IEFvdFJlbmRlckRlbGVnYXRlKCk7XG4gICAgZGVsZWdhdGUucmVnaXN0ZXJDb21wb25lbnQoJ0Jhc2ljJywgJ0Jhc2ljJywgJ1RpdGxlJywgYDxoMT5oZWxsbyB7e0B0aXRsZX19PC9oMT5gKTtcblxuICAgIGxldCBlbGVtZW50ID0gZGVsZWdhdGUuZ2V0SW5pdGlhbEVsZW1lbnQoKTtcbiAgICBsZXQgdGl0bGUgPSBQcmltaXRpdmVSZWZlcmVuY2UuY3JlYXRlKCdyZW5kZXJDb21wb25lbnQnKTtcbiAgICBkZWxlZ2F0ZS5yZW5kZXJDb21wb25lbnQoJ1RpdGxlJywgeyB0aXRsZSB9LCBlbGVtZW50KTtcbiAgICBRVW5pdC5hc3NlcnQuZXF1YWwoKGVsZW1lbnQgYXMgRWxlbWVudCkuaW5uZXJIVE1MLCAnPGgxPmhlbGxvIHJlbmRlckNvbXBvbmVudDwvaDE+Jyk7XG5cbiAgICBlbGVtZW50ID0gZGVsZWdhdGUuZ2V0SW5pdGlhbEVsZW1lbnQoKTtcbiAgICBsZXQgbmV3VGl0bGUgPSBQcmltaXRpdmVSZWZlcmVuY2UuY3JlYXRlKCduZXcgdGl0bGUnKTtcbiAgICBkZWxlZ2F0ZS5yZW5kZXJDb21wb25lbnQoJ1RpdGxlJywgeyB0aXRsZTogbmV3VGl0bGUgfSwgZWxlbWVudCk7XG4gICAgUVVuaXQuYXNzZXJ0LmVxdWFsKChlbGVtZW50IGFzIEVsZW1lbnQpLmlubmVySFRNTCwgJzxoMT5oZWxsbyBuZXcgdGl0bGU8L2gxPicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ2NhbiByZW5kZXIgZGlmZmVyZW50IGNvbXBvbmVudHMgcGVyIGNhbGwnKCkge1xuICAgIGxldCBkZWxlZ2F0ZSA9IG5ldyBBb3RSZW5kZXJEZWxlZ2F0ZSgpO1xuICAgIGRlbGVnYXRlLnJlZ2lzdGVyQ29tcG9uZW50KCdCYXNpYycsICdCYXNpYycsICdUaXRsZScsIGA8aDE+aGVsbG8ge3tAdGl0bGV9fTwvaDE+YCk7XG4gICAgZGVsZWdhdGUucmVnaXN0ZXJDb21wb25lbnQoJ0Jhc2ljJywgJ0Jhc2ljJywgJ0JvZHknLCBgPHA+Ym9keSB7e0Bib2R5fX08L3A+YCk7XG5cbiAgICBsZXQgZWxlbWVudCA9IGRlbGVnYXRlLmdldEluaXRpYWxFbGVtZW50KCk7XG4gICAgbGV0IHRpdGxlID0gUHJpbWl0aXZlUmVmZXJlbmNlLmNyZWF0ZSgncmVuZGVyQ29tcG9uZW50Jyk7XG4gICAgZGVsZWdhdGUucmVuZGVyQ29tcG9uZW50KCdUaXRsZScsIHsgdGl0bGUgfSwgZWxlbWVudCk7XG4gICAgUVVuaXQuYXNzZXJ0LmVxdWFsKChlbGVtZW50IGFzIEVsZW1lbnQpLmlubmVySFRNTCwgJzxoMT5oZWxsbyByZW5kZXJDb21wb25lbnQ8L2gxPicpO1xuXG4gICAgZWxlbWVudCA9IGRlbGVnYXRlLmdldEluaXRpYWxFbGVtZW50KCk7XG4gICAgbGV0IGJvZHkgPSBQcmltaXRpdmVSZWZlcmVuY2UuY3JlYXRlKCd0ZXh0Jyk7XG4gICAgZGVsZWdhdGUucmVuZGVyQ29tcG9uZW50KCdCb2R5JywgeyBib2R5IH0sIGVsZW1lbnQpO1xuICAgIFFVbml0LmFzc2VydC5lcXVhbCgoZWxlbWVudCBhcyBFbGVtZW50KS5pbm5lckhUTUwsICc8cD5ib2R5IHRleHQ8L3A+Jyk7XG4gIH1cbn1cbiJdfQ==