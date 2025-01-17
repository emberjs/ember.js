import QUnit from 'qunit';
import { lookupComponentPair } from '@ember/-internals/glimmer/lib/resolver';

QUnit.module('lookupComponentPair - Linha 106', function(){
    QUnit.test('Test where isFactory is TRUE and component.class is TRUE', function(assert){
        let component = {isFactory: true, class: true};
        let layout = {someProperty: 'value'};

        let result = lookupComponentPair(null, null, {component, layout});

        assert.deepEqual(result, {component, layout}, 'Correct return when isFactory and component.class are TRUE.');
    });

    QUnit.test('Test where isFactory is TRUE e component.class is FALSE', function(assert){
        let component = {isFactory: true, class: false};
        let layout = {someProperty: 'value'};

        let result = lookupComponentPair(null, null, {component, layout});
        
        assert.equal(result, null, 'Return null when isFactory is TRUE and component.class is FALSE');
    });

    QUnit.test('Test where isFactory is FALSE and component.class is TRUE', function(assert){
        let component = {isFactory: false, class:true};
        let layout = {someProperty: 'value'};

        let result = lookupComponentPair(null, null, {component, layout});

        assert.equal(result, null, 'Return null when is Factory is FALSE and component.class is TRUE');
    });

    QUnit.test('Test layout defined', function(assert){
        let component = {isFactory:true, class:true};
        let layout = {someProperty: 'value'};

        let result = lookupComponentPair(null, null, {component, layout});

        assert.deepEqual(result, {component, layout}, 'Return correct when layout is defined');
    });

    QUnit.test('Test layout undefined', function(assert){
        let component = {isFactory:true, class: true};
        let layout = undefined;

        let result = lookupComponentPair(null, null, {component, layout});

        assert.equal(result, null, 'Return null when layout is undefined');
    });

    QUnit.test('Test of null component and null layout', function(assert){
        let component = null;
        let layout = null;

        let result = lookupComponentPair(null, null, { component, layout });

        assert.equal(result, null, 'Return null when component and layout are null');
    })

    QUnit.test('Test of null component and not null layout', function(assert){
        let component = null;
        let layout = { someProperty: 'value' };

        let result = lookupComponentPair(null, null, { component, layout });

        assert.deepEqual(result, {component:null, layout}, 'Return correct when component is null and not null layout');
    });

    QUnit.test('Test of not null component and null layout',function(assert){
        let component = { isFactory: true, class: true };
        let layout = null;

        let result = lookupComponentPair(null, null, { component, layout });

        assert.deepEqual(result, {component, layout:null}, 'Return correct when not null component and null layout');
    });
});


