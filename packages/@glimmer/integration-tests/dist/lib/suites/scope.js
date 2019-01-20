var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { RenderTest } from '../render-test';
import { test } from '../test-decorator';
import { stripTight } from '../test-helpers/strings';
export class ScopeSuite extends RenderTest {
    'correct scope - conflicting local names'() {
        this.render({
            layout: stripTight `
        {{#with @a as |item|}}{{@a}}: {{item}},
          {{#with @b as |item|}} {{@b}}: {{item}},
            {{#with @c as |item|}} {{@c}}: {{item}}{{/with}}
          {{/with}}
        {{/with}}`,
            args: { a: '"A"', b: '"B"', c: '"C"' },
        });
        this.assertComponent('A: A, B: B, C: C');
        this.assertStableRerender();
    }
    'correct scope - conflicting block param and attr names'() {
        this.render({
            layout: 'Outer: {{@conflict}} {{#with @item as |conflict|}}Inner: {{@conflict}} Block: {{conflict}}{{/with}}',
            args: { item: '"from block"', conflict: '"from attr"' },
        });
        this.assertComponent('Outer: from attr Inner: from attr Block: from block');
        this.assertStableRerender();
    }
}
ScopeSuite.suiteName = 'Scope';
__decorate([
    test
], ScopeSuite.prototype, "correct scope - conflicting local names", null);
__decorate([
    test
], ScopeSuite.prototype, "correct scope - conflicting block param and attr names", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvc3VpdGVzL3Njb3BlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM1QyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDekMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRXJELE1BQU0sT0FBTyxVQUFXLFNBQVEsVUFBVTtJQUl4Qyx5Q0FBeUM7UUFDdkMsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFBRSxVQUFVLENBQUE7Ozs7O2tCQUtOO1lBQ1osSUFBSSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUU7U0FDdkMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHRCx3REFBd0Q7UUFDdEQsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFDSixxR0FBcUc7WUFDdkcsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFO1NBQ3hELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxlQUFlLENBQUMscURBQXFELENBQUMsQ0FBQztRQUM1RSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDOztBQTVCTSxvQkFBUyxHQUFHLE9BQU8sQ0FBQztBQUczQjtJQURDLElBQUk7eUVBY0o7QUFHRDtJQURDLElBQUk7d0ZBVUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSZW5kZXJUZXN0IH0gZnJvbSAnLi4vcmVuZGVyLXRlc3QnO1xuaW1wb3J0IHsgdGVzdCB9IGZyb20gJy4uL3Rlc3QtZGVjb3JhdG9yJztcbmltcG9ydCB7IHN0cmlwVGlnaHQgfSBmcm9tICcuLi90ZXN0LWhlbHBlcnMvc3RyaW5ncyc7XG5cbmV4cG9ydCBjbGFzcyBTY29wZVN1aXRlIGV4dGVuZHMgUmVuZGVyVGVzdCB7XG4gIHN0YXRpYyBzdWl0ZU5hbWUgPSAnU2NvcGUnO1xuXG4gIEB0ZXN0XG4gICdjb3JyZWN0IHNjb3BlIC0gY29uZmxpY3RpbmcgbG9jYWwgbmFtZXMnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogc3RyaXBUaWdodGBcbiAgICAgICAge3sjd2l0aCBAYSBhcyB8aXRlbXx9fXt7QGF9fToge3tpdGVtfX0sXG4gICAgICAgICAge3sjd2l0aCBAYiBhcyB8aXRlbXx9fSB7e0BifX06IHt7aXRlbX19LFxuICAgICAgICAgICAge3sjd2l0aCBAYyBhcyB8aXRlbXx9fSB7e0BjfX06IHt7aXRlbX19e3svd2l0aH19XG4gICAgICAgICAge3svd2l0aH19XG4gICAgICAgIHt7L3dpdGh9fWAsXG4gICAgICBhcmdzOiB7IGE6ICdcIkFcIicsIGI6ICdcIkJcIicsIGM6ICdcIkNcIicgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdBOiBBLCBCOiBCLCBDOiBDJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ2NvcnJlY3Qgc2NvcGUgLSBjb25mbGljdGluZyBibG9jayBwYXJhbSBhbmQgYXR0ciBuYW1lcycoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OlxuICAgICAgICAnT3V0ZXI6IHt7QGNvbmZsaWN0fX0ge3sjd2l0aCBAaXRlbSBhcyB8Y29uZmxpY3R8fX1Jbm5lcjoge3tAY29uZmxpY3R9fSBCbG9jazoge3tjb25mbGljdH19e3svd2l0aH19JyxcbiAgICAgIGFyZ3M6IHsgaXRlbTogJ1wiZnJvbSBibG9ja1wiJywgY29uZmxpY3Q6ICdcImZyb20gYXR0clwiJyB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ091dGVyOiBmcm9tIGF0dHIgSW5uZXI6IGZyb20gYXR0ciBCbG9jazogZnJvbSBibG9jaycpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxufVxuIl19