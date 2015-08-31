'use strict';

var assign = require('lodash/object/assign'),
    omit = require('lodash/object/omit'),
    isString = require('lodash/lang/isString'),
    isNumber = require('lodash/lang/isNumber');

var domify = require('min-dom/lib/domify'),
    domQuery = require('min-dom/lib/query'),
    domRemove = require('min-dom/lib/remove');

var Diagram = require('diagram-js'),
    BpmnModdle = require('bpmn-moddle');

var Importer = require('./import/Importer');


function initListeners(diagram, listeners) {
  var events = diagram.get('eventBus');

  listeners.forEach(function(l) {
    events.on(l.event, l.handler);
  });
}

function checkValidationError(err) {

  // check if we can help the user by indicating wrong BPMN 2.0 xml
  // (in case he or the exporting tool did not get that right)

  var pattern = /unparsable content <([^>]+)> detected([\s\S]*)$/;
  var match = pattern.exec(err.message);

  if (match) {
    err.message =
      'unparsable content <' + match[1] + '> detected; ' +
      'this may indicate an invalid BPMN 2.0 diagram file' + match[2];
  }

  return err;
}

var DEFAULT_OPTIONS = {
  width: '100%',
  height: '100%',
  position: 'relative',
  container: 'body'
};


/**
 * Ensure the passed argument is a proper unit (defaulting to px)
 */
function ensureUnit(val) {
  return val + (isNumber(val) ? 'px' : '');
}

/**
 * A viewer for BPMN 2.0 diagrams.
 *
 * Have a look at {@link NavigatedViewer} or {@link Modeler} for bundles that include
 * additional features.
 *
 *
 * ## Extending the Viewer
 *
 * In order to extend the viewer pass extension modules to bootstrap via the
 * `additionalModules` option. An extension module is an object that exposes
 * named services.
 *
 * The following example depicts the integration of a simple
 * logging component that integrates with interaction events:
 *
 *
 * ```javascript
 *
 * // logging component
 * function InteractionLogger(eventBus) {
 *   eventBus.on('element.hover', function(event) {
 *     console.log()
 *   })
 * }
 *
 * InteractionLogger.$inject = [ 'eventBus' ]; // minification save
 *
 * // extension module
 * var extensionModule = {
 *   __init__: [ 'interactionLogger' ],
 *   interactionLogger: [ 'type', InteractionLogger ]
 * };
 *
 * // extend the viewer
 * var bpmnViewer = new Viewer({ additionalModules: [ extensionModule ] });
 * bpmnViewer.importXML(...);
 * ```
 *
 * @param {Object} [options] configuration options to pass to the viewer
 * @param {DOMElement} [options.container] the container to render the viewer in, defaults to body.
 * @param {String|Number} [options.width] the width of the viewer
 * @param {String|Number} [options.height] the height of the viewer
 * @param {Object} [options.moddleExtensions] extension packages to provide
 * @param {Array<didi.Module>} [options.modules] a list of modules to override the default modules
 * @param {Array<didi.Module>} [options.additionalModules] a list of modules to use with the default modules
 */
function Viewer(options) {

  this.options = options = assign({}, DEFAULT_OPTIONS, options || {});

  var parent = options.container;

  // support jquery element
  // unwrap it if passed
  if (parent.get) {
    parent = parent.get(0);
  }

  // support selector
  if (isString(parent)) {
    parent = domQuery(parent);
  }

  var container = this.container = domify('<div class="bjs-container"></div>');
  parent.appendChild(container);

  assign(container.style, {
    width: ensureUnit(options.width),
    height: ensureUnit(options.height),
    position: options.position
  });

  /**
   * The code in the <project-logo></project-logo> area
   * must not be changed, see http://bpmn.io/license for more information
   *
   * <project-logo>
   */

  /* jshint -W101 */

  // inlined ../resources/bpmnjs.png
  var logoData = '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';

  /* jshint +W101 */

  var linkMarkup =
        '<a href="http://bpmn.io" ' +
           'target="_blank" ' +
           'class="bjs-powered-by" ' +
           'title="Powered by bpmn.io" ' +
           'style="position: absolute; bottom: 15px; right: 15px; z-index: 100">' +
            '<img src="data:image/png;base64,' + logoData + '">' +
        '</a>';

  container.appendChild(domify(linkMarkup));

  /* </project-logo> */
}

Viewer.prototype.importXML = function(xml, done) {

  var self = this;

  this.moddle = this.createModdle();

  this.moddle.fromXML(xml, 'bpmn:Definitions', function(err, definitions, context) {

    if (err) {
      err = checkValidationError(err);
      return done(err);
    }

    var parseWarnings = context.warnings;

    self.importDefinitions(definitions, function(err, importWarnings) {
      if (err) {
        return done(err);
      }

      done(null, parseWarnings.concat(importWarnings || []));
    });
  });
};

Viewer.prototype.saveXML = function(options, done) {

  if (!done) {
    done = options;
    options = {};
  }

  var definitions = this.definitions;

  if (!definitions) {
    return done(new Error('no definitions loaded'));
  }

  this.moddle.toXML(definitions, options, done);
};

Viewer.prototype.createModdle = function() {
  return new BpmnModdle(this.options.moddleExtensions);
};

Viewer.prototype.saveSVG = function(options, done) {

  if (!done) {
    done = options;
    options = {};
  }

  var canvas = this.get('canvas');

  var contentNode = canvas.getDefaultLayer(),
      defsNode = canvas._svg.select('defs');

  var contents = contentNode.innerSVG(),
      defs = (defsNode && defsNode.outerSVG()) || '';

  var bbox = contentNode.getBBox();

  var svg =
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<!-- created with bpmn-js / http://bpmn.io -->\n' +
    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
         'width="' + bbox.width + '" height="' + bbox.height + '" ' +
         'viewBox="' + bbox.x + ' ' + bbox.y + ' ' + bbox.width + ' ' + bbox.height + '" version="1.1">' +
      defs + contents +
    '</svg>';

  done(null, svg);
};

Viewer.prototype.get = function(name) {

  if (!this.diagram) {
    throw new Error('no diagram loaded');
  }

  return this.diagram.get(name);
};

Viewer.prototype.invoke = function(fn) {

  if (!this.diagram) {
    throw new Error('no diagram loaded');
  }

  return this.diagram.invoke(fn);
};

Viewer.prototype.importDefinitions = function(definitions, done) {

  // use try/catch to not swallow synchronous exceptions
  // that may be raised during model parsing
  try {
    if (this.diagram) {
      this.clear();
    }

    this.definitions = definitions;

    var diagram = this.diagram = this._createDiagram(this.options);

    this._init(diagram);

    Importer.importBpmnDiagram(diagram, definitions, done);
  } catch (e) {
    done(e);
  }
};

Viewer.prototype._init = function(diagram) {
  initListeners(diagram, this.__listeners || []);
};

Viewer.prototype._createDiagram = function(options) {

  var modules = [].concat(options.modules || this.getModules(), options.additionalModules || []);

  // add self as an available service
  modules.unshift({
    bpmnjs: [ 'value', this ],
    moddle: [ 'value', this.moddle ]
  });

  options = omit(options, 'additionalModules');

  options = assign(options, {
    canvas: { container: this.container },
    modules: modules
  });

  return new Diagram(options);
};


Viewer.prototype.getModules = function() {
  return this._modules;
};

/**
 * Remove all drawn elements from the viewer.
 *
 * After calling this method the viewer can still
 * be reused for opening another diagram.
 */
Viewer.prototype.clear = function() {
  var diagram = this.diagram;

  if (diagram) {
    diagram.destroy();
  }
};

/**
 * Destroy the viewer instance and remove all its remainders
 * from the document tree.
 */
Viewer.prototype.destroy = function() {
  // clear underlying diagram
  this.clear();

  // remove container
  domRemove(this.container);
};

/**
 * Register an event listener on the viewer
 *
 * @param {String} event
 * @param {Function} handler
 */
Viewer.prototype.on = function(event, handler) {
  var diagram = this.diagram,
      listeners = this.__listeners = this.__listeners || [];

  listeners.push({ event: event, handler: handler });

  if (diagram) {
    diagram.get('eventBus').on(event, handler);
  }
};

// modules the viewer is composed of
Viewer.prototype._modules = [
  require('./core'),
  require('diagram-js/lib/features/selection'),
  require('diagram-js/lib/features/overlays')
];

module.exports = Viewer;
