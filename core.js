// Draw Core
// At some point I'll rewrite this to just use mouse events instead of requiring
// the entire TweenMax + Draggable from GreenSock. It's kinda overkill for this.
(() => {
    var App = {};

    var svg = document.querySelector("#page");

    App.pages = []; // Arrays of path element drawing instructions
    App.paths = []; // Current page path element drawing instructions

    // Append a <path> element with an SVG d attribute value
    App.drawPath = function(path) {
        var el = document.createElementNS('http://www.w3.org/2000/svg',"path");
        el.setAttributeNS(null, 'class', 'stroke');
        el.setAttribute("d", path);
        svg.appendChild(el);
        document.querySelector('button[data-action=undo]').disabled = false;
        document.querySelector('button[data-action=clear]').disabled = false;
        return el;
    }

    // Remove last path
    // @todo: Support undoing a clear()
    App.undo = function() {
        var lastPath = svg.querySelector('path:last-of-type');
        if (lastPath) lastPath.remove();
    }

    // Remove all paths from current page
    // @todo: Don't disable undo once it supports undoing a clear
    App.clear = function() {
        var paths = svg.querySelectorAll('path');
        paths.forEach((path) => {
            path.remove();
        });
        document.querySelector('button[data-action=undo]').disabled = true;
        document.querySelector('button[data-action=clear]').disabled = true;
        localStorage.removeItem('drawapp.paths');
    }

    // Write path data to local storage
    // @todo: Store pages
    App.save = function() {
        localStorage.setItem('drawapp.paths', JSON.stringify(App.paths));
    }

    // Read path data from local storage
    // @todo: Read pages
    App.load = function() {
        var pathJSON = localStorage.getItem('drawapp.paths');
        if (pathJSON) {
            App.paths = JSON.parse(pathJSON);
        } else {
            document.querySelector('button[data-action=undo]').disabled = true;
            document.querySelector('button[data-action=clear]').disabled = true;
        }
        App.paths.forEach(App.drawPath);
    }

    // Toggle UI night mode
    // Returns true if night mode is enabled, false if it's disabled
    App.toggleNightMode = function() {
        if(document.body.className.indexOf('night') != -1) {
            document.body.className = document.body.className.replace('night', '').trim();
            return false;
        } else {
            document.body.className = (document.body.className + ' night').trim();
            return true;
        }
    }

    // Restore last drawing on load
    window.addEventListener('load', () => {
        App.load();
        if(localStorage.getItem('drawapp.night') == 1) {
            App.toggleNightMode();
        }
    });

    // Bind ctrl+z to undo()
    document.addEventListener('keydown', (e) => {
        var evtobj = window.event || e
        if (evtobj.keyCode == 90 && evtobj.ctrlKey) App.undo();
    });

    // Bind menu button
    // @todo: support menu button

    // Bind pages button
    // @todo: support pages button

    // Bind undo button
    document.querySelector('button[data-action=undo]').addEventListener('click', App.undo);

    // Bind clear button
    document.querySelector('button[data-action=clear]').addEventListener('click', App.clear);

    // Bind night mode button
    document.querySelector('button[data-action=night]').addEventListener('click', () => {
        localStorage.setItem('drawapp.night', App.toggleNightMode() ? 1 : 0);
    });

    // Bind save button/ctrl+s
    // @todo: support downloading a page as an SVG document

    var pencilPoint = document.querySelector("#pencil-point");
    var pencilPath = document.querySelector("#pencil-path");
    var points = [];

    // Initialize GS Draggable
    // This moves a polyline around the document and tracks the points on drag
    // @todo: Support drawing a single point without dragging
    new Draggable(pencilPoint, {
        bounds: "#page",
        trigger: "#page",
        cursor: "crosshair",
        onDrag: dragMove,
        onDragEnd: dragEnd,
        onPress: dragStart
    });

    // Start drawing a new path on mouse down
    function dragStart() {
        pencilPath.setAttribute("points", "");
        var x = this.pointerX;
        var y = this.pointerY;
        points = [x, y];
        TweenLite.set(pencilPoint, {x, y});
        this.update();
    }

    // Add stroke when mouse moves
    function dragMove() {
        var x = this.endX;
        var y = this.endY;
        points.push(x, y);
        pencilPath.setAttribute("points", points);
    }

    // Append new path on end of mouse drag
    function dragEnd() {
        var path = solve(points);
        App.paths.push(path);
        App.drawPath(path);
        App.save();
        pencilPath.setAttribute("points", "");
    }

    // Convert points to bezier curves in a path
    // @todo: Round points to n decimal values to save localStorge space
    function solve(data, k) {
        if (k == null) k = 1;

        var size = data.length;
        var last = size - 4;

        var path = `M${data[0]},${data[1]}`;

        for (var i = 0; i < size - 2; i += 2) {
            var x0 = i ? data[i - 2] : data[0];
            var y0 = i ? data[i - 1] : data[1];

            var x1 = data[i + 0];
            var y1 = data[i + 1];

            var x2 = data[i + 2];
            var y2 = data[i + 3];

            var x3 = i !== last ? data[i + 4] : x2;
            var y3 = i !== last ? data[i + 5] : y2;

            var cp1x = x1 + (x2 - x0) / 6 * k;
            var cp1y = y1 + (y2 - y0) / 6 * k;

            var cp2x = x2 - (x3 - x1) / 6 * k;
            var cp2y = y2 - (y3 - y1) / 6 * k;

            path += ` C${cp1x},${cp1y},${cp2x},${cp2y},${x2},${y2}`;
        }

        return path;
    }

    window.DrawApp = App;
})();
