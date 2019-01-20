// detect side-effects of cloning svg elements in IE9-11
let ieSVGInnerHTML = (function () {
    if (typeof document === 'undefined' || !document.createElementNS) {
        return false;
    }
    let div = document.createElement('div');
    let node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    div.appendChild(node);
    let clone = div.cloneNode(true);
    return clone.innerHTML === '<svg xmlns="http://www.w3.org/2000/svg" />';
})();
export function normalizeInnerHTML(actualHTML) {
    if (ieSVGInnerHTML) {
        // Replace `<svg xmlns="http://www.w3.org/2000/svg" height="50%" />` with `<svg height="50%"></svg>`, etc.
        // drop namespace attribute
        actualHTML = actualHTML.replace(/ xmlns="[^"]+"/, '');
        // replace self-closing elements
        actualHTML = actualHTML.replace(/<([^ >]+) [^\/>]*\/>/gi, function (tag, tagName) {
            return tag.slice(0, tag.length - 3) + '></' + tagName + '>';
        });
    }
    return actualHTML;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9ybWFsaXplLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL2RvbS9ub3JtYWxpemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsd0RBQXdEO0FBQ3hELElBQUksY0FBYyxHQUFHLENBQUM7SUFDcEIsSUFBSSxPQUFPLFFBQVEsS0FBSyxXQUFXLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFO1FBQ2hFLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFDRCxJQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hDLElBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDekUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0QixJQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBbUIsQ0FBQztJQUNsRCxPQUFPLEtBQUssQ0FBQyxTQUFTLEtBQUssNENBQTRDLENBQUM7QUFDMUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUVMLE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxVQUFrQjtJQUNuRCxJQUFJLGNBQWMsRUFBRTtRQUNsQiwwR0FBMEc7UUFDMUcsMkJBQTJCO1FBQzNCLFVBQVUsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELGdDQUFnQztRQUNoQyxVQUFVLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSxVQUFTLEdBQUcsRUFBRSxPQUFPO1lBQzdFLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsT0FBTyxHQUFHLEdBQUcsQ0FBQztRQUM5RCxDQUFDLENBQUMsQ0FBQztLQUNKO0lBRUQsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGRldGVjdCBzaWRlLWVmZmVjdHMgb2YgY2xvbmluZyBzdmcgZWxlbWVudHMgaW4gSUU5LTExXG5sZXQgaWVTVkdJbm5lckhUTUwgPSAoZnVuY3Rpb24oKSB7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnIHx8ICFkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgbGV0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBsZXQgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAnc3ZnJyk7XG4gIGRpdi5hcHBlbmRDaGlsZChub2RlKTtcbiAgbGV0IGNsb25lID0gZGl2LmNsb25lTm9kZSh0cnVlKSBhcyBIVE1MRGl2RWxlbWVudDtcbiAgcmV0dXJuIGNsb25lLmlubmVySFRNTCA9PT0gJzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIC8+Jztcbn0pKCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVJbm5lckhUTUwoYWN0dWFsSFRNTDogc3RyaW5nKSB7XG4gIGlmIChpZVNWR0lubmVySFRNTCkge1xuICAgIC8vIFJlcGxhY2UgYDxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIGhlaWdodD1cIjUwJVwiIC8+YCB3aXRoIGA8c3ZnIGhlaWdodD1cIjUwJVwiPjwvc3ZnPmAsIGV0Yy5cbiAgICAvLyBkcm9wIG5hbWVzcGFjZSBhdHRyaWJ1dGVcbiAgICBhY3R1YWxIVE1MID0gYWN0dWFsSFRNTC5yZXBsYWNlKC8geG1sbnM9XCJbXlwiXStcIi8sICcnKTtcbiAgICAvLyByZXBsYWNlIHNlbGYtY2xvc2luZyBlbGVtZW50c1xuICAgIGFjdHVhbEhUTUwgPSBhY3R1YWxIVE1MLnJlcGxhY2UoLzwoW14gPl0rKSBbXlxcLz5dKlxcLz4vZ2ksIGZ1bmN0aW9uKHRhZywgdGFnTmFtZSkge1xuICAgICAgcmV0dXJuIHRhZy5zbGljZSgwLCB0YWcubGVuZ3RoIC0gMykgKyAnPjwvJyArIHRhZ05hbWUgKyAnPic7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gYWN0dWFsSFRNTDtcbn1cbiJdfQ==