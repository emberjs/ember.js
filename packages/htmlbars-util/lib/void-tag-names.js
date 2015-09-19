import { forEach } from "./array-utils";
// The HTML elements in this list are speced by
// http://www.w3.org/TR/html-markup/syntax.html#syntax-elements,
// and will be forced to close regardless of if they have a
// self-closing /> at the end.
var voidTagNames = "area base br col command embed hr img input keygen link meta param source track wbr";
var voidMap = {};
forEach(voidTagNames.split(" "), function (tagName) {
    voidMap[tagName] = true;
});
export default voidMap;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZC10YWctbmFtZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvaHRtbGJhcnMtdXRpbC9saWIvdm9pZC10YWctbmFtZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ik9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxlQUFlO0FBRXZDLCtDQUErQztBQUMvQyxnRUFBZ0U7QUFDaEUsMkRBQTJEO0FBQzNELDhCQUE4QjtBQUM5QixJQUFJLFlBQVksR0FBRyxxRkFBcUYsQ0FBQztBQUN6RyxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7QUFFakIsT0FBTyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBUyxPQUFPO0lBQy9DLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUM7QUFFSCxlQUFlLE9BQU8sQ0FBQyJ9