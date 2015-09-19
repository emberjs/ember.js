import TemplateCompiler from "../htmlbars-compiler/template-compiler";
import { preprocess } from "../htmlbars-syntax/parser";
QUnit.module("TemplateCompiler");
function countNamespaceChanges(template) {
    var ast = preprocess(template);
    var compiler = new TemplateCompiler();
    var program = compiler.compile(ast);
    var matches = program.match(/dom\.setNamespace/g);
    return matches ? matches.length : 0;
}
test("it omits unnecessary namespace changes", function () {
    equal(countNamespaceChanges('<div></div>'), 0); // sanity check
    equal(countNamespaceChanges('<div><svg></svg></div><svg></svg>'), 1);
    equal(countNamespaceChanges('<div><svg></svg></div><div></div>'), 2);
    equal(countNamespaceChanges('<div><svg><title>foobar</title></svg></div><svg></svg>'), 1);
    equal(countNamespaceChanges('<div><svg><title><h1>foobar</h1></title></svg></div><svg></svg>'), 3);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUtY29tcGlsZXItdGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9odG1sYmFycy1jb21waWxlci90ZXN0cy90ZW1wbGF0ZS1jb21waWxlci10ZXN0LnRzIl0sIm5hbWVzIjpbImNvdW50TmFtZXNwYWNlQ2hhbmdlcyJdLCJtYXBwaW5ncyI6Ik9BQU8sZ0JBQWdCLE1BQU0sd0NBQXdDO09BQzlELEVBQUUsVUFBVSxFQUFFLE1BQU0sMkJBQTJCO0FBRXRELEtBQUssQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUVqQywrQkFBK0IsUUFBUTtJQUNyQ0EsSUFBSUEsR0FBR0EsR0FBR0EsVUFBVUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7SUFDL0JBLElBQUlBLFFBQVFBLEdBQUdBLElBQUlBLGdCQUFnQkEsRUFBRUEsQ0FBQ0E7SUFDdENBLElBQUlBLE9BQU9BLEdBQUdBLFFBQVFBLENBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO0lBQ3BDQSxJQUFJQSxPQUFPQSxHQUFHQSxPQUFPQSxDQUFDQSxLQUFLQSxDQUFDQSxvQkFBb0JBLENBQUNBLENBQUNBO0lBQ2xEQSxNQUFNQSxDQUFDQSxPQUFPQSxHQUFHQSxPQUFPQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQTtBQUN0Q0EsQ0FBQ0E7QUFFRCxJQUFJLENBQUMsd0NBQXdDLEVBQUU7SUFDN0MsS0FBSyxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUUsZUFBZTtJQUNoRSxLQUFLLENBQUMscUJBQXFCLENBQUMsbUNBQW1DLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyRSxLQUFLLENBQUMscUJBQXFCLENBQUMsbUNBQW1DLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyRSxLQUFLLENBQUMscUJBQXFCLENBQUMsd0RBQXdELENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMxRixLQUFLLENBQUMscUJBQXFCLENBQUMsaUVBQWlFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNyRyxDQUFDLENBQUMsQ0FBQyJ9