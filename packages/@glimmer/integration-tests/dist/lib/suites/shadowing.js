var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { RenderTest } from '../render-test';
import { test } from '../test-decorator';
export class ShadowingSuite extends RenderTest {
    'normal outer attributes are reflected'() {
        this.render({
            layout: 'In layout - someProp: {{@someProp}}',
            args: { someProp: '"something here"' },
        });
        this.assertComponent('In layout - someProp: something here');
        this.assertStableRerender();
    }
    'shadowing - normal outer attributes clobber inner attributes'() {
        this.render({
            layout: 'Hello!',
            layoutAttributes: { 'data-name': '"Godfrey"', 'data-foo': '"foo"' },
            attributes: { 'data-name': '"Godfrey"', 'data-foo': '"bar"' },
            args: { someProp: '"something here"' },
        });
        this.assertComponent('Hello!', { 'data-name': 'Godfrey', 'data-foo': 'bar' });
        this.assertStableRerender();
    }
    'outer attributes with concat are reflected'() {
        this.render({
            layout: 'In layout - someProp: {{@someProp}}',
            args: { someProp: 'someProp' },
        }, { someProp: 'something here' });
        this.assertComponent('In layout - someProp: something here');
        this.assertStableRerender();
        this.rerender({ someProp: 'something else' });
        this.assertComponent('In layout - someProp: something else');
        this.assertStableNodes();
        this.rerender({ someProp: '' });
        this.assertComponent('In layout - someProp: ');
        this.assertStableNodes();
        this.rerender({ someProp: 'something here' });
        this.assertComponent('In layout - someProp: something here');
        this.assertStableNodes();
    }
    'outer attributes with concat clobber inner attributes'() {
        this.render({
            layoutAttributes: { 'data-name': 'Godfrey', 'data-foo': 'foo' },
            layout: 'Hello!',
            attributes: { 'data-name': '"{{name}}"', 'data-foo': '"{{foo}}-bar"' },
        }, { name: 'Godhuda', foo: 'foo' });
        this.assertComponent('Hello!', { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' });
        this.assertStableRerender();
        this.rerender({ name: 'Yehuda', foo: 'baz' });
        this.assertComponent('Hello!', { 'data-name': 'Yehuda', 'data-foo': 'baz-bar' });
        this.assertStableNodes();
        this.rerender({ name: '', foo: '' });
        this.assertComponent('Hello!', { 'data-name': '', 'data-foo': '-bar' });
        this.assertStableNodes();
        this.rerender({ name: 'Godhuda', foo: 'foo' });
        this.assertComponent('Hello!', { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' });
        this.assertStableNodes();
    }
    'outer attributes clobber inner attributes with concat'() {
        this.render({
            layoutAttributes: { 'data-name': '{{@name}}', 'data-foo': '"{{@foo}}-bar"' },
            layout: 'Hello!',
            args: { name: 'name', foo: 'foo' },
            attributes: { 'data-name': '"Godhuda"', 'data-foo': '"foo-bar"' },
        }, { name: 'Godfrey', foo: 'foo' });
        this.assertComponent('Hello!', { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' });
        this.assertStableRerender();
        this.rerender({ name: 'Yehuda', foo: 'baz' });
        this.assertComponent('Hello!', { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' });
        this.assertStableNodes();
        this.rerender({ name: '', foo: '' });
        this.assertComponent('Hello!', { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' });
        this.assertStableNodes();
        this.rerender({ name: 'Godhuda', foo: 'foo' });
        this.assertComponent('Hello!', { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' });
        this.assertStableNodes();
    }
}
ShadowingSuite.suiteName = 'Shadowing';
__decorate([
    test({ kind: 'glimmer' })
], ShadowingSuite.prototype, "normal outer attributes are reflected", null);
__decorate([
    test({ kind: 'glimmer' })
], ShadowingSuite.prototype, "shadowing - normal outer attributes clobber inner attributes", null);
__decorate([
    test({ kind: 'glimmer' })
], ShadowingSuite.prototype, "outer attributes with concat are reflected", null);
__decorate([
    test({ kind: 'glimmer' })
], ShadowingSuite.prototype, "outer attributes with concat clobber inner attributes", null);
__decorate([
    test({ kind: 'glimmer' })
], ShadowingSuite.prototype, "outer attributes clobber inner attributes with concat", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhZG93aW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL3N1aXRlcy9zaGFkb3dpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUV6QyxNQUFNLE9BQU8sY0FBZSxTQUFRLFVBQVU7SUFJNUMsdUNBQXVDO1FBQ3JDLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUscUNBQXFDO1lBQzdDLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxrQkFBa0IsRUFBRTtTQUN2QyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxDQUFDLHNDQUFzQyxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUdELDhEQUE4RDtRQUM1RCxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ1YsTUFBTSxFQUFFLFFBQVE7WUFDaEIsZ0JBQWdCLEVBQUUsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUU7WUFDbkUsVUFBVSxFQUFFLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFO1lBQzdELElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxrQkFBa0IsRUFBRTtTQUN2QyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUdELDRDQUE0QztRQUMxQyxJQUFJLENBQUMsTUFBTSxDQUNUO1lBQ0UsTUFBTSxFQUFFLHFDQUFxQztZQUM3QyxJQUFJLEVBQUUs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QVMsRUFBRSxDQUFDOzJFQVN6QjtBQUdEO0lBREMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDO2tHQVd6QjtBQUdEO0lBREMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDO2dGQXdCekI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQzsyRkF5QnpCO0FBR0Q7SUFEQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUM7MkZBMEJ6QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJlbmRlclRlc3QgfSBmcm9tICcuLi9yZW5kZXItdGVzdCc7XG5pbXBvcnQgeyB0ZXN0IH0gZnJvbSAnLi4vdGVzdC1kZWNvcmF0b3InO1xuXG5leHBvcnQgY2xhc3MgU2hhZG93aW5nU3VpdGUgZXh0ZW5kcyBSZW5kZXJUZXN0IHtcbiAgc3RhdGljIHN1aXRlTmFtZSA9ICdTaGFkb3dpbmcnO1xuXG4gIEB0ZXN0KHsga2luZDogJ2dsaW1tZXInIH0pXG4gICdub3JtYWwgb3V0ZXIgYXR0cmlidXRlcyBhcmUgcmVmbGVjdGVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICdJbiBsYXlvdXQgLSBzb21lUHJvcDoge3tAc29tZVByb3B9fScsXG4gICAgICBhcmdzOiB7IHNvbWVQcm9wOiAnXCJzb21ldGhpbmcgaGVyZVwiJyB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ0luIGxheW91dCAtIHNvbWVQcm9wOiBzb21ldGhpbmcgaGVyZScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2dsaW1tZXInIH0pXG4gICdzaGFkb3dpbmcgLSBub3JtYWwgb3V0ZXIgYXR0cmlidXRlcyBjbG9iYmVyIGlubmVyIGF0dHJpYnV0ZXMnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJ0hlbGxvIScsXG4gICAgICBsYXlvdXRBdHRyaWJ1dGVzOiB7ICdkYXRhLW5hbWUnOiAnXCJHb2RmcmV5XCInLCAnZGF0YS1mb28nOiAnXCJmb29cIicgfSxcbiAgICAgIGF0dHJpYnV0ZXM6IHsgJ2RhdGEtbmFtZSc6ICdcIkdvZGZyZXlcIicsICdkYXRhLWZvbyc6ICdcImJhclwiJyB9LFxuICAgICAgYXJnczogeyBzb21lUHJvcDogJ1wic29tZXRoaW5nIGhlcmVcIicgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdIZWxsbyEnLCB7ICdkYXRhLW5hbWUnOiAnR29kZnJleScsICdkYXRhLWZvbyc6ICdiYXInIH0pO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2dsaW1tZXInIH0pXG4gICdvdXRlciBhdHRyaWJ1dGVzIHdpdGggY29uY2F0IGFyZSByZWZsZWN0ZWQnKCkge1xuICAgIHRoaXMucmVuZGVyKFxuICAgICAge1xuICAgICAgICBsYXlvdXQ6ICdJbiBsYXlvdXQgLSBzb21lUHJvcDoge3tAc29tZVByb3B9fScsXG4gICAgICAgIGFyZ3M6IHsgc29tZVByb3A6ICdzb21lUHJvcCcgfSxcbiAgICAgIH0sXG4gICAgICB7IHNvbWVQcm9wOiAnc29tZXRoaW5nIGhlcmUnIH1cbiAgICApO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ0luIGxheW91dCAtIHNvbWVQcm9wOiBzb21ldGhpbmcgaGVyZScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBzb21lUHJvcDogJ3NvbWV0aGluZyBlbHNlJyB9KTtcbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnSW4gbGF5b3V0IC0gc29tZVByb3A6IHNvbWV0aGluZyBlbHNlJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IHNvbWVQcm9wOiAnJyB9KTtcbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnSW4gbGF5b3V0IC0gc29tZVByb3A6ICcpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBzb21lUHJvcDogJ3NvbWV0aGluZyBoZXJlJyB9KTtcbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnSW4gbGF5b3V0IC0gc29tZVByb3A6IHNvbWV0aGluZyBoZXJlJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuICB9XG5cbiAgQHRlc3QoeyBraW5kOiAnZ2xpbW1lcicgfSlcbiAgJ291dGVyIGF0dHJpYnV0ZXMgd2l0aCBjb25jYXQgY2xvYmJlciBpbm5lciBhdHRyaWJ1dGVzJygpIHtcbiAgICB0aGlzLnJlbmRlcihcbiAgICAgIHtcbiAgICAgICAgbGF5b3V0QXR0cmlidXRlczogeyAnZGF0YS1uYW1lJzogJ0dvZGZyZXknLCAnZGF0YS1mb28nOiAnZm9vJyB9LFxuICAgICAgICBsYXlvdXQ6ICdIZWxsbyEnLFxuICAgICAgICBhdHRyaWJ1dGVzOiB7ICdkYXRhLW5hbWUnOiAnXCJ7e25hbWV9fVwiJywgJ2RhdGEtZm9vJzogJ1wie3tmb299fS1iYXJcIicgfSxcbiAgICAgIH0sXG4gICAgICB7IG5hbWU6ICdHb2RodWRhJywgZm9vOiAnZm9vJyB9XG4gICAgKTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdIZWxsbyEnLCB7ICdkYXRhLW5hbWUnOiAnR29kaHVkYScsICdkYXRhLWZvbyc6ICdmb28tYmFyJyB9KTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgbmFtZTogJ1llaHVkYScsIGZvbzogJ2JheicgfSk7XG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ0hlbGxvIScsIHsgJ2RhdGEtbmFtZSc6ICdZZWh1ZGEnLCAnZGF0YS1mb28nOiAnYmF6LWJhcicgfSk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IG5hbWU6ICcnLCBmb286ICcnIH0pO1xuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdIZWxsbyEnLCB7ICdkYXRhLW5hbWUnOiAnJywgJ2RhdGEtZm9vJzogJy1iYXInIH0pO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBuYW1lOiAnR29kaHVkYScsIGZvbzogJ2ZvbycgfSk7XG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ0hlbGxvIScsIHsgJ2RhdGEtbmFtZSc6ICdHb2RodWRhJywgJ2RhdGEtZm9vJzogJ2Zvby1iYXInIH0pO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2dsaW1tZXInIH0pXG4gICdvdXRlciBhdHRyaWJ1dGVzIGNsb2JiZXIgaW5uZXIgYXR0cmlidXRlcyB3aXRoIGNvbmNhdCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoXG4gICAgICB7XG4gICAgICAgIGxheW91dEF0dHJpYnV0ZXM6IHsgJ2RhdGEtbmFtZSc6ICd7e0BuYW1lfX0nLCAnZGF0YS1mb28nOiAnXCJ7e0Bmb299fS1iYXJcIicgfSxcbiAgICAgICAgbGF5b3V0OiAnSGVsbG8hJyxcbiAgICAgICAgYXJnczogeyBuYW1lOiAnbmFtZScsIGZvbzogJ2ZvbycgfSxcbiAgICAgICAgYXR0cmlidXRlczogeyAnZGF0YS1uYW1lJzogJ1wiR29kaHVkYVwiJywgJ2RhdGEtZm9vJzogJ1wiZm9vLWJhclwiJyB9LFxuICAgICAgfSxcbiAgICAgIHsgbmFtZTogJ0dvZGZyZXknLCBmb286ICdmb28nIH1cbiAgICApO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ0hlbGxvIScsIHsgJ2RhdGEtbmFtZSc6ICdHb2RodWRhJywgJ2RhdGEtZm9vJzogJ2Zvby1iYXInIH0pO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBuYW1lOiAnWWVodWRhJywgZm9vOiAnYmF6JyB9KTtcbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnSGVsbG8hJywgeyAnZGF0YS1uYW1lJzogJ0dvZGh1ZGEnLCAnZGF0YS1mb28nOiAnZm9vLWJhcicgfSk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IG5hbWU6ICcnLCBmb286ICcnIH0pO1xuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdIZWxsbyEnLCB7ICdkYXRhLW5hbWUnOiAnR29kaHVkYScsICdkYXRhLWZvbyc6ICdmb28tYmFyJyB9KTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgbmFtZTogJ0dvZGh1ZGEnLCBmb286ICdmb28nIH0pO1xuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdIZWxsbyEnLCB7ICdkYXRhLW5hbWUnOiAnR29kaHVkYScsICdkYXRhLWZvbyc6ICdmb28tYmFyJyB9KTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG4gIH1cbn1cbiJdfQ==