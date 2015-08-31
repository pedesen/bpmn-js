'use strict';

var inherits = require('inherits');

var is = require('../../util/ModelUtil').is;

var forEach = require('lodash/collection/forEach');

var CommandInterceptor = require('diagram-js/lib/command/CommandInterceptor');


function Dungeon(eventBus, elementRegistry, zoomScroll){

  eventBus.on([ 'shape.added' ], function(event) {
    var element = event.element,
        gfx = event.gfx;

    if (element.type === 'label') {
      return;
    }

    if (is(element, 'bpmn:Task') || is(element, 'bpmn:CallActivity')){

      var uri = 'resources/scroll.png';

      var bla = gfx.image(uri, -20, -20, element.width+40, element.height+40);
      bla.insertBefore(gfx.children()[0]);
    }

    if (is(element, 'bpmn:StartEvent') && element.type !== 'label'){
      var startUri = 'resources/green-diamond.png';
      gfx.image(startUri, 0, 0, element.width, element.height);

    }

    if (is(element, 'bpmn:EndEvent') && element.type !== 'label'){
      var endUri = 'resources/red-diamond.png';
      gfx.image(endUri, 0, 0, element.width, element.height);
    }

    if (is(element, 'bpmn:Gateway')) {
      var gatewayUri = 'resources/swords.png';
      gfx.image(gatewayUri, 0, 0, element.width+2, element.height+2);
    }

    if (is(element, 'bpmn:SubProcess')) {

      var hellUri = 'resources/hell.png';

      var hellImage = gfx.image(hellUri, 0, 0, element.width, element.height);
      hellImage.insertBefore(gfx.children()[0]);
    }
  });

  eventBus.on([ 'canvas.init' ], function(event){
    var uri = 'resources/bg.jpg';
    event.viewport.image(uri);
  });

  function start() {

    hideAll();

    var elements = elementRegistry.filter(function(element){
      if (is(element, 'bpmn:StartEvent') && element.parent.type === 'bpmn:Process'){
        return true;
      }
    });

    forEach(elements, function(element) {
      show(element.id);
    });
  }

  function show(elementId) {
    var gfx = elementRegistry.getGraphics(elementId);
    if (gfx) {
      gfx.attr('display', 'inline');
    }
  }

  function hide(elementId) {
    var gfx = elementRegistry.getGraphics(elementId);
    gfx.attr('display', 'none');
  }

  function hideAll() {
    var allElements = elementRegistry.filter(function(element){
      return !is(element, 'bpmn:Process');
    });

    forEach(allElements, function(element) {
      hide(element);
    });
  }

  function showElements(elementIds) {

    forEach(elementIds, function(id) {

      show(id);

      var element = elementRegistry.get(id);

      if (!element) {
        console.log('element with id '+ id + ' not found!');
        return;
      }

      if (element.incoming && element.incoming !== []) {
        var connections = element.incoming;

        forEach(connections, function(connection) {
          if (elementIds.indexOf(connection.source.id) !== -1){
            show(connection.id);
          }
        });
      }
    });
  }

  function showNext(taskId) {
    var element = elementRegistry.get(taskId);

    forEach(element.outgoing, function(connection) {

      var target = connection.target;
      if (is(target, 'bpmn:Gateway') || is(target, 'bpmn:EndEvent')){
        show(connection.id);
        show(target.id);
      }
    });
  }

  function bla(x, y) {
    zoomScroll.reset();
    zoomScroll.scroll({ dx: x, dy: y});
  }

  function scrollTo(elementId) {

    var PADDING = 75;

    var el = elementRegistry.get(elementId);

    if (el) {
      var delta = { dx: -el.x + PADDING, dy: -el.y + PADDING };
      console.log('scrollTo ' + elementId + ' position: '+ delta.dx + '|' + delta.dy );

      zoomScroll.reset();
      zoomScroll.scroll(delta);
    }
  }

  this.hideAll = hideAll;
  this.showElements = showElements;
  this.showElement = show;
  this.showNext = showNext;
  this.start = start;
  this.scrollTo = scrollTo;
  this.bla = bla;

  console.log(this);
}

Dungeon.$inject = [ 'eventBus', 'elementRegistry', 'zoomScroll' ];

inherits(Dungeon, CommandInterceptor);

module.exports = Dungeon;
