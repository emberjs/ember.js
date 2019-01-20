var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { AbstractNodeTest, NodeJitRenderDelegate, NodeAotRenderDelegate } from '../modes/node/env';
import { test } from '../test-decorator';
import { NodeDOMTreeConstruction, serializeBuilder } from '@glimmer/node';
import { RenderTest } from '../render-test';
import { blockStack } from '../dom/blocks';
import { strip } from '../test-helpers/strings';
import { toInnerHTML } from '../dom/simple-utils';
import { precompile } from '@glimmer/compiler';
export class DOMHelperTests extends AbstractNodeTest {
    'can instantiate NodeDOMTreeConstruction without a document'() {
        // this emulates what happens in Ember when using `App.visit('/', { shouldRender: false });`
        let helper = new NodeDOMTreeConstruction(null);
        this.assert.ok(!!helper, 'helper was instantiated without errors');
    }
}
DOMHelperTests.suiteName = 'Server-side rendering in Node.js (normal)';
__decorate([
    test
], DOMHelperTests.prototype, "can instantiate NodeDOMTreeConstruction without a document", null);
export class CompilationTests extends RenderTest {
    'generates id in node'() {
        let template = precompile('hello');
        let obj = JSON.parse(template);
        this.assert.equal(obj.id, 'zgnsoV7o', 'short sha of template source');
        template = precompile('hello', { meta: { moduleName: 'template/hello' } });
        obj = JSON.parse(template);
        this.assert.equal(obj.id, 'Ybe5TwSG', 'short sha of template source and meta');
    }
}
CompilationTests.suiteName = 'Id generation';
__decorate([
    test
], CompilationTests.prototype, "generates id in node", null);
export class JitSerializationDelegate extends NodeJitRenderDelegate {
    getElementBuilder(env, cursor) {
        return serializeBuilder(env, cursor);
    }
}
JitSerializationDelegate.style = 'jit serialization';
export class AotSerializationDelegate extends NodeAotRenderDelegate {
    getElementBuilder(env, cursor) {
        return serializeBuilder(env, cursor);
    }
}
export class SerializedDOMHelperTests extends DOMHelperTests {
    'The compiler can handle unescaped HTML'() {
        this.render('<div>{{{title}}}</div>', { title: '<strong>hello</strong>' });
        let b = blockStack();
        this.assertHTML(strip `
      <div>
        ${b(1)}
        <!--%glmr%-->
        <strong>hello</strong>
        <!--%glmr%-->
        ${b(1)}
      </div>
    `);
    }
    'Unescaped helpers render correctly'() {
        this.registerHelper('testing-unescaped', params => params[0]);
        this.render('{{{testing-unescaped "<span>hi</span>"}}}');
        let b = blockStack();
        this.assertHTML(strip `
      ${b(1)}
      <!--%glmr%-->
      <span>hi</span>
      <!--%glmr%-->
      ${b(1)}
    `);
    }
    'Null literals do not have representation in DOM'() {
        let b = blockStack();
        this.render('{{null}}');
        this.assertHTML(strip `${b(1)}<!--% %-->${b(1)}`);
    }
    'Elements inside a yielded block'() {
        this.render('{{#if true}}<div id="test">123</div>{{/if}}');
        let b = blockStack();
        this.assertHTML(strip `
      ${b(1)}
      <div id=\"test\">123</div>
      ${b(1)}
    `);
    }
    'A simple block helper can return text'() {
        this.render('{{#if true}}test{{else}}not shown{{/if}}');
        let b = blockStack();
        this.assertHTML(strip `
      ${b(1)}
      test
      ${b(1)}
    `);
    }
    assertHTML(html) {
        let b = blockStack();
        let serialized = toInnerHTML(this.element);
        this.assert.equal(serialized, `${b(0)}${html}${b(0)}`);
    }
}
SerializedDOMHelperTests.suiteName = 'Server-side rendering in Node.js (serialize)';
__decorate([
    test
], SerializedDOMHelperTests.prototype, "The compiler can handle unescaped HTML", null);
__decorate([
    test
], SerializedDOMHelperTests.prototype, "Unescaped helpers render correctly", null);
__decorate([
    test
], SerializedDOMHelperTests.prototype, "Null literals do not have representation in DOM", null);
__decorate([
    test
], SerializedDOMHelperTests.prototype, "Elements inside a yielded block", null);
__decorate([
    test
], SerializedDOMHelperTests.prototype, "A simple block helper can return text", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tLWRvbS1oZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvc3VpdGVzL2N1c3RvbS1kb20taGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ25HLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUN6QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRTVDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDM0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ2hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFL0MsTUFBTSxPQUFPLGNBQWUsU0FBUSxnQkFBZ0I7SUFJbEQsNERBQTREO1FBQzFELDRGQUE0RjtRQUU1RixJQUFJLE1BQU0sR0FBRyxJQUFJLHVCQUF1QixDQUFDLElBQVcsQ0FBQyxDQUFDO1FBRXRELElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsd0NBQXdDLENBQUMsQ0FBQztJQUNyRSxDQUFDOztBQVRNLHdCQUFTLEdBQUcsMkNBQTJDLENBQUM7QUFHL0Q7SUFEQyxJQUFJO2dHQU9KO0FBR0gsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFVBQVU7SUFJOUMsc0JBQXNCO1FBQ3BCLElBQUksUUFBUSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFD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UUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ1AsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFVBQVUsQ0FBQyxJQUFZO1FBQ3JCLElBQUksQ0FBQyxHQUFHLFVBQVUsRUFBRSxDQUFDO1FBQ3JCLElBQUksVUFBVSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3pELENBQUM7O0FBaEVNLGtDQUFTLEdBQUcsOENBQThDLENBQUM7QUFHbEU7SUFEQyxJQUFJO3NGQWFKO0FBR0Q7SUFEQyxJQUFJO2tGQVlKO0FBR0Q7SUFEQyxJQUFJOytGQUtKO0FBR0Q7SUFEQyxJQUFJOytFQVNKO0FBR0Q7SUFEQyxJQUFJO3FGQVNKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQWJzdHJhY3ROb2RlVGVzdCwgTm9kZUppdFJlbmRlckRlbGVnYXRlLCBOb2RlQW90UmVuZGVyRGVsZWdhdGUgfSBmcm9tICcuLi9tb2Rlcy9ub2RlL2Vudic7XG5pbXBvcnQgeyB0ZXN0IH0gZnJvbSAnLi4vdGVzdC1kZWNvcmF0b3InO1xuaW1wb3J0IHsgTm9kZURPTVRyZWVDb25zdHJ1Y3Rpb24sIHNlcmlhbGl6ZUJ1aWxkZXIgfSBmcm9tICdAZ2xpbW1lci9ub2RlJztcbmltcG9ydCB7IFJlbmRlclRlc3QgfSBmcm9tICcuLi9yZW5kZXItdGVzdCc7XG5pbXBvcnQgeyBFbnZpcm9ubWVudCwgQ3Vyc29yIH0gZnJvbSAnQGdsaW1tZXIvaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBibG9ja1N0YWNrIH0gZnJvbSAnLi4vZG9tL2Jsb2Nrcyc7XG5pbXBvcnQgeyBzdHJpcCB9IGZyb20gJy4uL3Rlc3QtaGVscGVycy9zdHJpbmdzJztcbmltcG9ydCB7IHRvSW5uZXJIVE1MIH0gZnJvbSAnLi4vZG9tL3NpbXBsZS11dGlscyc7XG5pbXBvcnQgeyBwcmVjb21waWxlIH0gZnJvbSAnQGdsaW1tZXIvY29tcGlsZXInO1xuXG5leHBvcnQgY2xhc3MgRE9NSGVscGVyVGVzdHMgZXh0ZW5kcyBBYnN0cmFjdE5vZGVUZXN0IHtcbiAgc3RhdGljIHN1aXRlTmFtZSA9ICdTZXJ2ZXItc2lkZSByZW5kZXJpbmcgaW4gTm9kZS5qcyAobm9ybWFsKSc7XG5cbiAgQHRlc3RcbiAgJ2NhbiBpbnN0YW50aWF0ZSBOb2RlRE9NVHJlZUNvbnN0cnVjdGlvbiB3aXRob3V0IGEgZG9jdW1lbnQnKCkge1xuICAgIC8vIHRoaXMgZW11bGF0ZXMgd2hhdCBoYXBwZW5zIGluIEVtYmVyIHdoZW4gdXNpbmcgYEFwcC52aXNpdCgnLycsIHsgc2hvdWxkUmVuZGVyOiBmYWxzZSB9KTtgXG5cbiAgICBsZXQgaGVscGVyID0gbmV3IE5vZGVET01UcmVlQ29uc3RydWN0aW9uKG51bGwgYXMgYW55KTtcblxuICAgIHRoaXMuYXNzZXJ0Lm9rKCEhaGVscGVyLCAnaGVscGVyIHdhcyBpbnN0YW50aWF0ZWQgd2l0aG91dCBlcnJvcnMnKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ29tcGlsYXRpb25UZXN0cyBleHRlbmRzIFJlbmRlclRlc3Qge1xuICBzdGF0aWMgc3VpdGVOYW1lID0gJ0lkIGdlbmVyYXRpb24nO1xuXG4gIEB0ZXN0XG4gICdnZW5lcmF0ZXMgaWQgaW4gbm9kZScoKSB7XG4gICAgbGV0IHRlbXBsYXRlID0gcHJlY29tcGlsZSgnaGVsbG8nKTtcbiAgICBsZXQgb2JqID0gSlNPTi5wYXJzZSh0ZW1wbGF0ZSk7XG4gICAgdGhpcy5hc3NlcnQuZXF1YWwob2JqLmlkLCAnemduc29WN28nLCAnc2hvcnQgc2hhIG9mIHRlbXBsYXRlIHNvdXJjZScpO1xuICAgIHRlbXBsYXRlID0gcHJlY29tcGlsZSgnaGVsbG8nLCB7IG1ldGE6IHsgbW9kdWxlTmFtZTogJ3RlbXBsYXRlL2hlbGxvJyB9IH0pO1xuICAgIG9iaiA9IEpTT04ucGFyc2UodGVtcGxhdGUpO1xuICAgIHRoaXMuYXNzZXJ0LmVxdWFsKG9iai5pZCwgJ1liZTVUd1NHJywgJ3Nob3J0IHNoYSBvZiB0ZW1wbGF0ZSBzb3VyY2UgYW5kIG1ldGEnKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgSml0U2VyaWFsaXphdGlvbkRlbGVnYXRlIGV4dGVuZHMgTm9kZUppdFJlbmRlckRlbGVnYXRlIHtcbiAgc3RhdGljIHN0eWxlID0gJ2ppdCBzZXJpYWxpemF0aW9uJztcblxuICBnZXRFbGVtZW50QnVpbGRlcihlbnY6IEVudmlyb25tZW50LCBjdXJzb3I6IEN1cnNvcikge1xuICAgIHJldHVybiBzZXJpYWxpemVCdWlsZGVyKGVudiwgY3Vyc29yKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQW90U2VyaWFsaXphdGlvbkRlbGVnYXRlIGV4dGVuZHMgTm9kZUFvdFJlbmRlckRlbGVnYXRlIHtcbiAgZ2V0RWxlbWVudEJ1aWxkZXIoZW52OiBFbnZpcm9ubWVudCwgY3Vyc29yOiBDdXJzb3IpIHtcbiAgICByZXR1cm4gc2VyaWFsaXplQnVpbGRlcihlbnYsIGN1cnNvcik7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFNlcmlhbGl6ZWRET01IZWxwZXJUZXN0cyBleHRlbmRzIERPTUhlbHBlclRlc3RzIHtcbiAgc3RhdGljIHN1aXRlTmFtZSA9ICdTZXJ2ZXItc2lkZSByZW5kZXJpbmcgaW4gTm9kZS5qcyAoc2VyaWFsaXplKSc7XG5cbiAgQHRlc3RcbiAgJ1RoZSBjb21waWxlciBjYW4gaGFuZGxlIHVuZXNjYXBlZCBIVE1MJygpIHtcbiAgICB0aGlzLnJlbmRlcignPGRpdj57e3t0aXRsZX19fTwvZGl2PicsIHsgdGl0bGU6ICc8c3Ryb25nPmhlbGxvPC9zdHJvbmc+JyB9KTtcbiAgICBsZXQgYiA9IGJsb2NrU3RhY2soKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoc3RyaXBgXG4gICAgICA8ZGl2PlxuICAgICAgICAke2IoMSl9XG4gICAgICAgIDwhLS0lZ2xtciUtLT5cbiAgICAgICAgPHN0cm9uZz5oZWxsbzwvc3Ryb25nPlxuICAgICAgICA8IS0tJWdsbXIlLS0+XG4gICAgICAgICR7YigxKX1cbiAgICAgIDwvZGl2PlxuICAgIGApO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1VuZXNjYXBlZCBoZWxwZXJzIHJlbmRlciBjb3JyZWN0bHknKCkge1xuICAgIHRoaXMucmVnaXN0ZXJIZWxwZXIoJ3Rlc3RpbmctdW5lc2NhcGVkJywgcGFyYW1zID0+IHBhcmFtc1swXSk7XG4gICAgdGhpcy5yZW5kZXIoJ3t7e3Rlc3RpbmctdW5lc2NhcGVkIFwiPHNwYW4+aGk8L3NwYW4+XCJ9fX0nKTtcbiAgICBsZXQgYiA9IGJsb2NrU3RhY2soKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoc3RyaXBgXG4gICAgICAke2IoMSl9XG4gICAgICA8IS0tJWdsbXIlLS0+XG4gICAgICA8c3Bhbj5oaTwvc3Bhbj5cbiAgICAgIDwhLS0lZ2xtciUtLT5cbiAgICAgICR7YigxKX1cbiAgICBgKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdOdWxsIGxpdGVyYWxzIGRvIG5vdCBoYXZlIHJlcHJlc2VudGF0aW9uIGluIERPTScoKSB7XG4gICAgbGV0IGIgPSBibG9ja1N0YWNrKCk7XG4gICAgdGhpcy5yZW5kZXIoJ3t7bnVsbH19Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKHN0cmlwYCR7YigxKX08IS0tJSAlLS0+JHtiKDEpfWApO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0VsZW1lbnRzIGluc2lkZSBhIHlpZWxkZWQgYmxvY2snKCkge1xuICAgIHRoaXMucmVuZGVyKCd7eyNpZiB0cnVlfX08ZGl2IGlkPVwidGVzdFwiPjEyMzwvZGl2Pnt7L2lmfX0nKTtcbiAgICBsZXQgYiA9IGJsb2NrU3RhY2soKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoc3RyaXBgXG4gICAgICAke2IoMSl9XG4gICAgICA8ZGl2IGlkPVxcXCJ0ZXN0XFxcIj4xMjM8L2Rpdj5cbiAgICAgICR7YigxKX1cbiAgICBgKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdBIHNpbXBsZSBibG9jayBoZWxwZXIgY2FuIHJldHVybiB0ZXh0JygpIHtcbiAgICB0aGlzLnJlbmRlcigne3sjaWYgdHJ1ZX19dGVzdHt7ZWxzZX19bm90IHNob3due3svaWZ9fScpO1xuICAgIGxldCBiID0gYmxvY2tTdGFjaygpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChzdHJpcGBcbiAgICAgICR7YigxKX1cbiAgICAgIHRlc3RcbiAgICAgICR7YigxKX1cbiAgICBgKTtcbiAgfVxuXG4gIGFzc2VydEhUTUwoaHRtbDogc3RyaW5nKSB7XG4gICAgbGV0IGIgPSBibG9ja1N0YWNrKCk7XG4gICAgbGV0IHNlcmlhbGl6ZWQgPSB0b0lubmVySFRNTCh0aGlzLmVsZW1lbnQpO1xuICAgIHRoaXMuYXNzZXJ0LmVxdWFsKHNlcmlhbGl6ZWQsIGAke2IoMCl9JHtodG1sfSR7YigwKX1gKTtcbiAgfVxufVxuIl19