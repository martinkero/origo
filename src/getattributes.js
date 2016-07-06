/* ========================================================================
 * Copyright 2016 Mälardalskartan
 * Licensed under BSD 2-Clause (https://github.com/malardalskartan/mdk/blob/master/LICENSE.txt)
 * ======================================================================== */
"use strict";
var featureinfotemplates = require('./featureinfotemplates');

module.exports = function(feature, layer) {
    var content = '<div><ul>';
    var attribute, li = '', title, val;
    //If layer is configured with attributes
    if(layer.get('attributes')) {
          //If attributes is string then use template named with the string
          if(typeof layer.get('attributes') === 'string') {
              //Use attributes with the template
              li = featureinfotemplates(layer.get('attributes'),feature.getProperties());
          }
          else {
              for(var i=0; i<layer.get('attributes').length; i++) {
                attribute = layer.get('attributes')[i];
                title = '';
                val = '';
                if (attribute['name']) {
                  if(feature.get(attribute['name'])) {
                      val = feature.get(attribute['name']);
                      if (attribute['title']) {
                        title = '<b>' + attribute['title'] + '</b>';
                      }
                      if (attribute['url']) {
                        if(feature.get(attribute['url'])) {
                        var url = createUrl(attribute['urlPrefix'], attribute['urlSuffix'], feature.get(attribute['url']));
                        val = '<a href="' + url + '" target="_blank">' +
                              feature.get(attribute['name']) +
                              '</a>';
                        }
                      }
                  }
                }
                else if (attribute['url']) {
                    if(feature.get(attribute['url'])) {
                        var text = attribute['html'] || attribute['url'];
                        var url = createUrl(attribute['urlPrefix'], attribute['urlSuffix'], feature.get(attribute['url']));
                        val = '<a href="' + url + '" target="_blank">' +
                              text +
                              '</a>';
                    }
                }
                else if (attribute['img']) {
                    if(feature.get(attribute['img'])) {
                        var url = createUrl(attribute['urlPrefix'], attribute['urlSuffix'], feature.get(attribute['img']));
                        var attribution = attribute['attribution'] ? '<div class="image-attribution">' + attribute['attribution'] + '</div>' : '';
                        val = '<div class="image-container">' +
                                  '<img src="' + url + '">' + attribution +
                              '</div>';
                    }
                }
                else if (attribute['html']) {
                  val = attribute['html'];
                }

                var cls = ' class="' + attribute['cls'] + '" ' || '';

                li += '<li' + cls +'>' + title + val + '</li>';
              }
        }
    }
    else {
      //Clean feature attributes from non-wanted properties
      var attributes = filterObject(feature.getProperties(), ['FID_', 'geometry']);
      //Use attributes with the template
      li = featureinfotemplates('default',attributes);
    }
    content += li + '</ul></div>';
    return content;
}
function filterObject(obj, excludedKeys) {
    var result = {}, key;
    for (key in obj) {
        if(excludedKeys.indexOf(key) === -1) {
            result[key] = obj[key];
        }
    }
    return result;
}
function createUrl(prefix, suffix, url) {
    var p = prefix || '';
    var s = suffix || '';
    return p + url + s;
}
