(function(app) {
  'use strict';

  var jCore = require('jcore');
  var helper = app.helper || require('../helper.js');
  var dom = app.dom || require('../dom.js');
  var Panel = app.Panel || require('./panel.js');

  var Content = jCore.Component.inherits(function() {
    this.movePanelsWithAnimation = this.prop(0);
    this.panels = [];
    this.draggable = new Content.Draggable(this);
  });

  Content.prototype.loadPanel = function(props) {
    var panel = new Panel(props);
    panel.parentElement(this.element());
    panel.redraw();
    this.panels.push(panel);
    return panel.load();
  };

  Content.prototype.removePanel = function(panel) {
    panel.parentElement(null);
    helper.remove(this.panels, panel);
  };

  Content.prototype.movePanels = function(dy) {
    if (this.panels.length === 0) {
      return;
    }
    var minTop = this.panels.reduce(function(top, panel) {
      return Math.min(top, panel.top());
    }, Number.MAX_VALUE);
    if (minTop + dy > 0) {
      // don't show an area above the top panel
      dy = -minTop;
    }
    if (dy === 0) {
      return;
    }
    this.panels.forEach(function(panel) {
      panel.top(panel.top() + dy);
    });
  };

  Content.prototype.oninit = function() {
    this.draggable.enable();
  };

  Content.prototype.onredraw = function() {
    this.redrawBy('movePanelsWithAnimation', function(rest) {
      if (this.panels.length === 0) {
        return;
      }
      if (rest === 0) {
        this.onanimationend();
        return;
      }
      var dy = (rest > 0 ? 1 : -1) * Math.min(Math.abs(rest), 24);
      this.panels.forEach(function(panel) {
        panel.top(panel.top() + dy);
        panel.redraw();
      });
      setTimeout(function() {
        this.movePanelsWithAnimation(rest - dy);
      }.bind(this));
    });
  };

  Content.prototype.onanimationend = function() {
    // remove panels located on the out of the window
    this.panels.slice().forEach(function(panel) {
      if (panel.bottom() <= 0) {
        this.removePanel(panel);
      }
    }.bind(this));
  };

  Content.Draggable = (function() {
    var Draggable = jCore.Draggable.inherits();

    Draggable.prototype.onstart = function(content, x, y, event, context) {
      dom.cancel(event);
      context.dy = 0;
      context.ddy = 0;
      content.movePanelsWithAnimation(0);
    };

    Draggable.prototype.onmove = function(content, dx, dy, event, context) {
      var ddy = dy - context.dy;
      if (ddy === 0) {
        return;
      }
      context.dy = dy;
      context.ddy = ddy;
      content.movePanels(ddy);
    };

    Draggable.prototype.onend = function(content, dx, dy, event, context) {
      if (content.panels.length === 0) {
        return;
      }
      // find that a part of the panel located on the out of the window
      var overflowPanel = helper.findLast(content.panels, function(panel) {
        return (panel.top() * panel.bottom() < 0);
      });
      if (!overflowPanel) {
        var maxTop = content.panels.reduce(function(top, panel) {
          return Math.max(top, panel.top());
        }, -Number.MAX_VALUE);
        if (maxTop < 0) {
          // all panels are located on the out of the window
          content.movePanelsWithAnimation(-maxTop);
        }
        return;
      }
      var hasNext = content.panels.some(function(panel) {
        return (panel.bottom() > overflowPanel.bottom());
      });
      var d;
      if (hasNext) {
        var top = overflowPanel.top();
        var bottom = overflowPanel.bottom();
        if (Math.abs(top) >= 24 && Math.abs(bottom) >= 24) {
          d = (context.ddy > 0 ? -top : -bottom);
        } else {
          d = (Math.abs(top) < Math.abs(bottom) ? -top : -bottom);
        }
      } else {
        // leave the last panel
        d = -overflowPanel.top();
      }
      content.movePanelsWithAnimation(d);
    };

    return Draggable;
  })();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Content;
  } else {
    app.Content = Content;
  }
})(this.app || (this.app = {}));
