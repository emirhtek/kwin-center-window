var App = {};
App.states = {};

App.loadConfig = function () {
  App.config = {
    WIDTH: Number(readConfig('WIDTH', 0.5)) || 0.5,
    HEIGHT: Number(readConfig('HEIGHT', 0.6)) || 0.6,
    STEP_X: Number(readConfig('STEP_X', 40)) || 40,
    STEP_Y: Number(readConfig('STEP_Y', 30)) || 30,
    MIN_WIDTH: 400,
    MIN_HEIGHT: 300
  };
};

App.loadConfig();

App.isValidWindow = function (win) {
  if (!win) return false;
  var isMovable = typeof win.moveable !== 'undefined' ? win.moveable : win.movable;
  if (!win.resizeable && !isMovable) return false;
  if (win.specialWindow || win.dock || win.desktopWindow) return false;
  if (!win.normalWindow) return false;
  return true;
};

App.isEqual = function (g1, g2) {
  if (!g1 || !g2) return false;
  return Math.abs(g1.x - g2.x) <= 10 &&
         Math.abs(g1.y - g2.y) <= 10 &&
         Math.abs(g1.width - g2.width) <= 10 &&
         Math.abs(g1.height - g2.height) <= 10;
};

App.cleanWindowState = function (win) {
  if (typeof win.setMaximize === 'function') {
    win.setMaximize(false, false);
  } else {
    try {
      win.maximized = false;
    } catch (e) {}
  }

  if (win.quickTileMode && win.quickTileMode !== 0) {
    win.quickTileMode = 0;
  }

  if (win.tile) {
    win.tile = null;
  }
};

App.toggle = function () {
  var win = workspace.activeWindow;
  if (!App.isValidWindow(win)) return;

  var id = win.internalId ? win.internalId.toString() : null;
  if (!id) return;

  var currentGeo = win.frameGeometry;
  var state = App.states[id];

  if (state && App.isEqual(currentGeo, state.applied)) {
    if (state.wasMaximized && typeof win.setMaximize === 'function') {
      win.setMaximize(true, true);
    } else {
      win.frameGeometry = state.original;
    }
    delete App.states[id];
    return;
  }

  var area = workspace.clientArea(KWin.MaximizeArea, win);
  var isMax = false;

  if (typeof win.maximized !== 'undefined') {
    isMax = Boolean(win.maximized);
  } else {
    isMax = App.isEqual(currentGeo, area);
  }

  App.cleanWindowState(win);

  var width = win.resizeable ? Math.floor(area.width * App.config.WIDTH) : currentGeo.width;
  var height = win.resizeable ? Math.floor(area.height * App.config.HEIGHT) : currentGeo.height;
  var x = area.x + Math.floor((area.width - width) / 2);
  var y = area.y + Math.floor((area.height - height) / 2);

  var targetGeo = { x: x, y: y, width: width, height: height };

  App.states[id] = {
    original: { x: currentGeo.x, y: currentGeo.y, width: currentGeo.width, height: currentGeo.height },
    applied: targetGeo,
    wasMaximized: isMax
  };

  win.frameGeometry = targetGeo;
};

App.resizeFromCenter = function (direction) {
  var win = workspace.activeWindow;
  if (!App.isValidWindow(win) || !win.resizeable) return;

  var id = win.internalId ? win.internalId.toString() : null;
  if (!id) return;

  App.cleanWindowState(win);

  var area = workspace.clientArea(KWin.MaximizeArea, win);
  var currentGeo = win.frameGeometry;

  var centerX = currentGeo.x + Math.floor(currentGeo.width / 2);
  var centerY = currentGeo.y + Math.floor(currentGeo.height / 2);

  var newWidth = currentGeo.width + (App.config.STEP_X * 2 * direction);
  var newHeight = currentGeo.height + (App.config.STEP_Y * 2 * direction);

  newWidth = Math.max(App.config.MIN_WIDTH, Math.min(newWidth, area.width));
  newHeight = Math.max(App.config.MIN_HEIGHT, Math.min(newHeight, area.height));

  var newX = centerX - Math.floor(newWidth / 2);
  var newY = centerY - Math.floor(newHeight / 2);

  if (newX < area.x) newX = area.x;
  if (newY < area.y) newY = area.y;
  if (newX + newWidth > area.x + area.width) newX = area.x + area.width - newWidth;
  if (newY + newHeight > area.y + area.height) newY = area.y + area.height - newHeight;

  win.frameGeometry = { x: newX, y: newY, width: newWidth, height: newHeight };

  delete App.states[id];
};

App.expand = function () { App.resizeFromCenter(1); };
App.shrink = function () { App.resizeFromCenter(-1); };

App.main = function () {
  registerShortcut('toggle', 'kwin-center-window: Center / Restore Window', 'Meta+C', App.toggle);
  registerShortcut('expand', 'kwin-center-window: Expand Center', 'Ctrl+Alt+J', App.expand);
  registerShortcut('shrink', 'kwin-center-window: Shrink Center', 'Ctrl+Alt+K', App.shrink);

  if (typeof options !== 'undefined' && options.configChanged) {
    options.configChanged.connect(App.loadConfig);
  }

  workspace.windowRemoved.connect(function (win) {
    if (win && win.internalId) {
      delete App.states[win.internalId.toString()];
    }
  });
};

App.main();
