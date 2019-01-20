var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { RenderTest } from '../render-test';
import { test } from '../test-decorator';
export class WithDynamicVarsSuite extends RenderTest {
    'Can get and set dynamic variable'() {
        this.render({
            layout: '{{#-with-dynamic-vars myKeyword=@value}}{{yield}}{{/-with-dynamic-vars}}',
            template: '{{-get-dynamic-var "myKeyword"}}',
            args: { value: 'value' },
        }, { value: 'hello' });
        this.assertComponent('hello');
        this.assertStableRerender();
        this.rerender({ value: 'goodbye' });
        this.assertComponent('goodbye');
        this.assertStableNodes();
        this.rerender({ value: 'hello' });
        this.assertComponent('hello');
        this.assertStableNodes();
    }
    'Can get and set dynamic variable with bound names'() {
        this.render({
            layout: '{{#-with-dynamic-vars myKeyword=@value1 secondKeyword=@value2}}{{yield}}{{/-with-dynamic-vars}}',
            template: '{{keyword}}-{{-get-dynamic-var keyword}}',
            args: { value1: 'value1', value2: 'value2' },
        }, { value1: 'hello', value2: 'goodbye', keyword: 'myKeyword' });
        this.assertComponent('myKeyword-hello');
        this.assertStableRerender();
        this.rerender({ keyword: 'secondKeyword' });
        this.assertComponent('secondKeyword-goodbye');
        this.assertStableNodes();
        this.rerender({ value2: 'goodbye!' });
        this.assertComponent('secondKeyword-goodbye!');
        this.assertStableNodes();
        this.rerender({ value1: 'hello', value2: 'goodbye', keyword: 'myKeyword' });
        this.assertComponent('myKeyword-hello');
        this.assertStableNodes();
    }
    'Can shadow existing dynamic variable'() {
        this.render({
            layout: '{{#-with-dynamic-vars myKeyword=@outer}}<div>{{-get-dynamic-var "myKeyword"}}</div>{{#-with-dynamic-vars myKeyword=@inner}}{{yield}}{{/-with-dynamic-vars}}<div>{{-get-dynamic-var "myKeyword"}}</div>{{/-with-dynamic-vars}}',
            template: '<div>{{-get-dynamic-var "myKeyword"}}</div>',
            args: { outer: 'outer', inner: 'inner' },
        }, { outer: 'original', inner: 'shadowed' });
        this.assertComponent('<div>original</div><div>shadowed</div><div>original</div>');
        this.assertStableRerender();
        this.rerender({ outer: 'original2', inner: 'shadowed' });
        this.assertComponent('<div>original2</div><div>shadowed</div><div>original2</div>');
        this.assertStableNodes();
        this.rerender({ outer: 'original2', inner: 'shadowed2' });
        this.assertComponent('<div>original2</div><div>shadowed2</div><div>original2</div>');
        this.assertStableNodes();
        this.rerender({ outer: 'original', inner: 'shadowed' });
        this.assertComponent('<div>original</div><div>shadowed</div><div>original</div>');
        this.assertStableNodes();
    }
}
WithDynamicVarsSuite.suiteName = '-with-dynamic-vars and -get-dynamic-var';
__decorate([
    test
], WithDynamicVarsSuite.prototype, "Can get and set dynamic variable", null);
__decorate([
    test
], WithDynamicVarsSuite.prototype, "Can get and set dynamic variable with bound names", null);
__decorate([
    test
], WithDynamicVarsSuite.prototype, "Can shadow existing dynamic variable", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2l0aC1keW5hbWljLXZhcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvc3VpdGVzL3dpdGgtZHluYW1pYy12YXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM1QyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFekMsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFVBQVU7SUFHbEQsa0NBQWtDO1FBQ2hDLElBQUksQ0FBQyxNQUFNLENBQ1Q7WUFDRSxNQUFNLEVBQUUsMEVBQTBFO1lBQ2xGLFFBQVEsRUFBRSxrQ0FBa0M7WUFDNUMsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRTtTQUN6QixFQUNELEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUNuQixDQUFDO1FBRUYsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUU1QixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUV6QixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDbEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBR0QsbURBQW1EO1FBQ2pELElBQUksQ0FBQyxNQUFNLENBQ1Q7WUFDRSxNQUFNLEVBQ0osaUdBQWlHO1lBQ25HLFFBQVEsRUFBRSwwQ0FBMEM7WUFDcEQsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO1NBQzdDLEVBQ0QsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUM3RCxDQUFDO1FBRUYsSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBRTVCLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsZUFBZSxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUV6QixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQzVFLElBQUksQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN4QyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBR0Qsc0NBQXNDO1FBQ3BDLElBQUksQ0FBQyxNQUFNLENBQ1Q7WUFDRSxNQUFNLEVBQ0osK05BQStOO1lBQ2pPLFFBQVEsRUFBRSw2Q0FBNkM7WUFDdkQsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFO1NBQ3pDLEVBQ0QsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsQ0FDekMsQ0FBQztRQUVGLElBQUksQ0FBQyxlQUFlLENBQUMsMkRBQTJELENBQUMsQ0FBQztRQUNsRixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUU1QixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsZUFBZSxDQUFDLDZEQUE2RCxDQUFDLENBQUM7UUFDcEYsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDMUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO1FBQ3JGLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBRXpCLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxlQUFlLENBQUMsMkRBQTJELENBQUMsQ0FBQztRQUNsRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMzQixDQUFDOztBQTlFTSw4QkFBUyxHQUFHLHlDQUF5QyxDQUFDO0FBRTdEO0lBREMsSUFBSTs0RUFxQko7QUFHRDtJQURDLElBQUk7NkZBMEJKO0FBR0Q7SUFEQyxJQUFJO2dGQTBCSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJlbmRlclRlc3QgfSBmcm9tICcuLi9yZW5kZXItdGVzdCc7XG5pbXBvcnQgeyB0ZXN0IH0gZnJvbSAnLi4vdGVzdC1kZWNvcmF0b3InO1xuXG5leHBvcnQgY2xhc3MgV2l0aER5bmFtaWNWYXJzU3VpdGUgZXh0ZW5kcyBSZW5kZXJUZXN0IHtcbiAgc3RhdGljIHN1aXRlTmFtZSA9ICctd2l0aC1keW5hbWljLXZhcnMgYW5kIC1nZXQtZHluYW1pYy12YXInO1xuICBAdGVzdFxuICAnQ2FuIGdldCBhbmQgc2V0IGR5bmFtaWMgdmFyaWFibGUnKCkge1xuICAgIHRoaXMucmVuZGVyKFxuICAgICAge1xuICAgICAgICBsYXlvdXQ6ICd7eyMtd2l0aC1keW5hbWljLXZhcnMgbXlLZXl3b3JkPUB2YWx1ZX19e3t5aWVsZH19e3svLXdpdGgtZHluYW1pYy12YXJzfX0nLFxuICAgICAgICB0ZW1wbGF0ZTogJ3t7LWdldC1keW5hbWljLXZhciBcIm15S2V5d29yZFwifX0nLFxuICAgICAgICBhcmdzOiB7IHZhbHVlOiAndmFsdWUnIH0sXG4gICAgICB9LFxuICAgICAgeyB2YWx1ZTogJ2hlbGxvJyB9XG4gICAgKTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdoZWxsbycpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyB2YWx1ZTogJ2dvb2RieWUnIH0pO1xuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdnb29kYnllJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IHZhbHVlOiAnaGVsbG8nIH0pO1xuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdoZWxsbycpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdDYW4gZ2V0IGFuZCBzZXQgZHluYW1pYyB2YXJpYWJsZSB3aXRoIGJvdW5kIG5hbWVzJygpIHtcbiAgICB0aGlzLnJlbmRlcihcbiAgICAgIHtcbiAgICAgICAgbGF5b3V0OlxuICAgICAgICAgICd7eyMtd2l0aC1keW5hbWljLXZhcnMgbXlLZXl3b3JkPUB2YWx1ZTEgc2Vjb25kS2V5d29yZD1AdmFsdWUyfX17e3lpZWxkfX17ey8td2l0aC1keW5hbWljLXZhcnN9fScsXG4gICAgICAgIHRlbXBsYXRlOiAne3trZXl3b3JkfX0te3stZ2V0LWR5bmFtaWMtdmFyIGtleXdvcmR9fScsXG4gICAgICAgIGFyZ3M6IHsgdmFsdWUxOiAndmFsdWUxJywgdmFsdWUyOiAndmFsdWUyJyB9LFxuICAgICAgfSxcbiAgICAgIHsgdmFsdWUxOiAnaGVsbG8nLCB2YWx1ZTI6ICdnb29kYnllJywga2V5d29yZDogJ215S2V5d29yZCcgfVxuICAgICk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnbXlLZXl3b3JkLWhlbGxvJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGtleXdvcmQ6ICdzZWNvbmRLZXl3b3JkJyB9KTtcbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnc2Vjb25kS2V5d29yZC1nb29kYnllJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IHZhbHVlMjogJ2dvb2RieWUhJyB9KTtcbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnc2Vjb25kS2V5d29yZC1nb29kYnllIScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyB2YWx1ZTE6ICdoZWxsbycsIHZhbHVlMjogJ2dvb2RieWUnLCBrZXl3b3JkOiAnbXlLZXl3b3JkJyB9KTtcbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnbXlLZXl3b3JkLWhlbGxvJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0NhbiBzaGFkb3cgZXhpc3RpbmcgZHluYW1pYyB2YXJpYWJsZScoKSB7XG4gICAgdGhpcy5yZW5kZXIoXG4gICAgICB7XG4gICAgICAgIGxheW91dDpcbiAgICAgICAgICAne3sjLXdpdGgtZHluYW1pYy12YXJzIG15S2V5d29yZD1Ab3V0ZXJ9fTxkaXY+e3stZ2V0LWR5bmFtaWMtdmFyIFwibXlLZXl3b3JkXCJ9fTwvZGl2Pnt7Iy13aXRoLWR5bmFtaWMtdmFycyBteUtleXdvcmQ9QGlubmVyfX17e3lpZWxkfX17ey8td2l0aC1keW5hbWljLXZhcnN9fTxkaXY+e3stZ2V0LWR5bmFtaWMtdmFyIFwibXlLZXl3b3JkXCJ9fTwvZGl2Pnt7Ly13aXRoLWR5bmFtaWMtdmFyc319JyxcbiAgICAgICAgdGVtcGxhdGU6ICc8ZGl2Pnt7LWdldC1keW5hbWljLXZhciBcIm15S2V5d29yZFwifX08L2Rpdj4nLFxuICAgICAgICBhcmdzOiB7IG91dGVyOiAnb3V0ZXInLCBpbm5lcjogJ2lubmVyJyB9LFxuICAgICAgfSxcbiAgICAgIHsgb3V0ZXI6ICdvcmlnaW5hbCcsIGlubmVyOiAnc2hhZG93ZWQnIH1cbiAgICApO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJzxkaXY+b3JpZ2luYWw8L2Rpdj48ZGl2PnNoYWRvd2VkPC9kaXY+PGRpdj5vcmlnaW5hbDwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBvdXRlcjogJ29yaWdpbmFsMicsIGlubmVyOiAnc2hhZG93ZWQnIH0pO1xuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCc8ZGl2Pm9yaWdpbmFsMjwvZGl2PjxkaXY+c2hhZG93ZWQ8L2Rpdj48ZGl2Pm9yaWdpbmFsMjwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBvdXRlcjogJ29yaWdpbmFsMicsIGlubmVyOiAnc2hhZG93ZWQyJyB9KTtcbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnPGRpdj5vcmlnaW5hbDI8L2Rpdj48ZGl2PnNoYWRvd2VkMjwvZGl2PjxkaXY+b3JpZ2luYWwyPC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IG91dGVyOiAnb3JpZ2luYWwnLCBpbm5lcjogJ3NoYWRvd2VkJyB9KTtcbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnPGRpdj5vcmlnaW5hbDwvZGl2PjxkaXY+c2hhZG93ZWQ8L2Rpdj48ZGl2Pm9yaWdpbmFsPC9kaXY+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuICB9XG59XG4iXX0=