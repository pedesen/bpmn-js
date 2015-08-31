'use strict';

var assign = require('lodash/object/assign');

var setLabel = require('../label-editing/LabelUtil').setLabel;

/**
 * A palette provider for BPMN 2.0 elements.
 */
function PaletteProvider(palette, create, elementFactory, spaceTool, lassoTool) {

  this._create = create;
  this._elementFactory = elementFactory;
  this._spaceTool = spaceTool;
  this._lassoTool = lassoTool;

  palette.registerProvider(this);
}

module.exports = PaletteProvider;

PaletteProvider.$inject = [ 'palette', 'create', 'elementFactory', 'spaceTool', 'lassoTool' ];


PaletteProvider.prototype.getPaletteEntries = function(element) {

  var actions  = {},
      create = this._create,
      elementFactory = this._elementFactory,
      spaceTool = this._spaceTool,
      lassoTool = this._lassoTool;


  function createAction(type, group, className, title, options, label) {

    function createListener(event) {
      var shape = elementFactory.createShape(assign({ type: type }, options));
      if (label) {
        setLabel(shape, label);
      }

      if (options) {
        shape.businessObject.di.isExpanded = options.isExpanded;
      }

      create.start(event, shape);
    }

    var shortType = type.replace(/^bpmn\:/, '');

    return {
      group: group,
      className: className,
      title: title || 'Create ' + shortType,
      action: {
        dragstart: createListener,
        click: createListener
      }
    };
  }

  assign(actions, {
    'lasso-tool': {
      group: 'tools',
      className: 'icon-lasso-tool',
      title: 'Activate the lasso tool',
      action: {
        click: function(event) {
          lassoTool.activateSelection(event);
        }
      }
    },
    'space-tool': {
      group: 'tools',
      className: 'icon-space-tool',
      title: 'Activate the create/remove space tool',
      action: {
        click: function(event) {
          spaceTool.activateSelection(event);
        }
      }
    },
    'tool-separator': {
      group: 'tools',
      separator: true
    },
    'create.start-event': createAction(
      'bpmn:StartEvent', 'event', 'icon-green-diamond'
    ),
    'create.end-event': createAction(
      'bpmn:EndEvent', 'event', 'icon-red-diamond'
    ),
    'create.sword': createAction(
      'bpmn:ExclusiveGateway', 'activity', 'icon-swords', 'Create Exclusive Gateway'
    ),
    'create.story': createAction(
      'bpmn:CallActivity', 'activity', 'icon-monster', 'Create Monster', {}, 'Monster'
    ),
    'create.riddle': createAction(
      'bpmn:CallActivity', 'activity', 'icon-riddle', 'Create Riddle', {}, 'Riddle'
    ),
    'create.monster': createAction(
      'bpmn:CallActivity', 'activity', 'icon-story', 'Create Story Item', {}, 'Story Item'
    ),

  });

  return actions;
};
