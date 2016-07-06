/* ========================================================================
 * Copyright 2016 Mälardalskartan
 * Licensed under BSD 2-Clause (https://github.com/malardalskartan/mdk/blob/master/LICENSE.txt)
 * ======================================================================== */
"use strict";

var ol = require('openlayers');
var $ = require('jquery');
var Viewer = require('./viewer');
var Popup = require('./popup');
var sidebar = require('./sidebar');
var maputils = require('./maputils');
var featurelayer = require('./featurelayer');
var style = require('./style');
var styleTypes = require('./style/styletypes');
var getFeatureInfo = require('./getfeatureinfo');
var owlCarousel = require('../externs/owlcarousel-browserify');
owlCarousel.loadjQueryPlugin();

var selectionLayer = undefined,
    savedPin = undefined,
    options,
    map,
    pinning,
    pinStyle,
    selectionStyles,
    showOverlay,
    identifyTarget,
    clusterFeatureinfoLevel;


function init(opt_options) {
    map = Viewer.getMap();

    options = opt_options || {};

    pinning = options.hasOwnProperty('pinning') ? options.pinning : true;
    var pinStyleOptions = options.hasOwnProperty('pinStyle') ? options.pinStyle : styleTypes.getStyle('pin');
    pinStyle = style.createStyleRule(pinStyleOptions)[0];
    savedPin = options.savedPin ? maputils.createPointFeature(opt_options.savedPin, pinStyle) : undefined;

    selectionStyles = style.createEditStyle();

    var savedSelection = options.savedSelection || undefined;
    var savedFeature = savedPin || savedSelection || undefined;
    selectionLayer = featurelayer(savedFeature, map);

    showOverlay = options.hasOwnProperty('overlay') ? options.overlay : true;

    if(showOverlay) {
        Popup.init('#map');
        identifyTarget = 'overlay';
    }
    else {
        sidebar.init();
        identifyTarget = 'sidebar';
    }

    clusterFeatureinfoLevel = options.hasOwnProperty('clusterFeatureinfoLevel') ? options.clusterFeatureinfoLevel : 1;

    map.on('click', onClick);
    $('.o-map').on('enableInteraction', onEnableInteraction);

}

function getSelection() {
    var selection = {};
    selection.geometryType = selectionLayer.getFeatures()[0].getGeometry().getType();
    selection.coordinates = selectionLayer.getFeatures()[0].getGeometry().getCoordinates();
    return selection;
}
function getPin() {
    return savedPin;
}
function identify(items, target, coordinate) {
    var layers = items.map(function(i){
        return i.layer;
    });
    var content = items.map(function(i){
        return i.content;
    }).join('');
    content = '<div id="identify"><div id="mdk-identify-carousel" class="owl-carousel owl-theme">' + content + '</div></div>';
    switch (target) {
        case 'overlay':
            var overlay = new ol.Overlay({
              element: $('#popup').get(0)
            });
            map.addOverlay(overlay);
            var geometry = items[0].feature.getGeometry();
            var coord;
            geometry.getType() == 'Point' ? coord = geometry.getCoordinates() : coord = coordinate;
            overlay.setPosition(coord);
            Popup.setContent({content: content, title: items[0].layer.get('title')});
            Popup.setVisibility(true);
            var owl = initCarousel('#mdk-identify-carousel', undefined, function(){
                var currentItem = this.owl.currentItem;
                selectionLayer.clearAndAdd(items[currentItem].feature.clone(), selectionStyles[items[currentItem].feature.getGeometry().getType()]);
                Popup.setTitle(items[currentItem].layer.get('title'));
            });
            Viewer.autoPan();
            break;
        case 'sidebar':
            sidebar.setContent({content: content, title: items[0].layer.get('title')});
            sidebar.setVisibility(true);
            var owl = initCarousel('#mdk-identify-carousel', undefined, function(){
                var currentItem = this.owl.currentItem;
                selectionLayer.clearAndAdd(items[currentItem].feature.clone(), selectionStyles[items[currentItem].feature.getGeometry().getType()]);
                sidebar.setTitle(items[currentItem].layer.get('title'));
            });
            break;
    }
}
function onClick(evt) {
    Popup.setVisibility(false);
    Viewer.removeOverlays();
    savedPin = undefined;
    //Featurinfo in two steps. Concat serverside and clientside when serverside is finished
    var clientResult = getFeatureInfo.getFeaturesAtPixel(evt);
    //Abort if clientResult is false
    if(clientResult !== false) {
        getFeatureInfo.getFeaturesFromRemote(evt)
            .done(function(data) {
                var serverResult = data || [];
                var result = serverResult.concat(clientResult);
                if (result.length > 0) {
                    selectionLayer.clear();
                    identify(result, identifyTarget, evt.coordinate)
                }
                else if(selectionLayer.getFeatures().length > 0) {
                    selectionLayer.clear();
                    sidebar.setVisibility(false);
                    console.log("Clearing selection");
                }
                else if(pinning){
                    sidebar.setVisibility(false);
                    var resolution = map.getView().getResolution();
                    setTimeout(function() {
                        if(!maputils.checkZoomChange(resolution, map.getView().getResolution())) {
                            savedPin = maputils.createPointFeature(evt.coordinate, pinStyle);
                            selectionLayer.addFeature(savedPin);
                        }
                    }, 250);
                }
                else {
                    console.log('No features identified');
                }
            });
    }
}
function setActive(state) {
    if(state === true) {
        map.on('click', onClick);
    }
    else {
        selectionLayer.clear();
        Popup.setVisibility(false);
        map.un('click', onClick);
    }
}
function onEnableInteraction(e) {
    if(e.interaction === 'featureInfo') {
        setActive(true);
    }
    else {
        setActive(false);
    }
}
function initCarousel(id, options, cb) {
    var carouselOptions = options || {
      navigation : true, // Show next and prev buttons
      slideSpeed : 300,
      paginationSpeed : 400,
      singleItem:true,
      rewindSpeed:200,
      navigationText: ['<svg class="mdk-icon-fa-chevron-left"><use xlink:href="css/svg/fa-icons.svg#fa-chevron-left"></use></svg>', '<svg class="mdk-icon-fa-chevron-right"><use xlink:href="css/svg/fa-icons.svg#fa-chevron-right"></use></svg>'],
      afterAction: cb
    };
    return $(id).owlCarousel(carouselOptions);
}

module.exports.init = init;
module.exports.getSelection = getSelection;
module.exports.getPin = getPin;
module.exports.identify = identify;
