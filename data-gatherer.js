// ==UserScript==
// @name        Transform event data from code to GeoJson
// @include     http://www.kulturosnaktis.lt/lt/projects/map
// @run-at      document-start
// @grant       none
// @require     https://gist.githubusercontent.com/BrockA/2620135/raw/83e1e5e36f130fa4e0cc2127175e293a90674d85/checkForBadJavascripts.js
// ==/UserScript==

/**
 * This function creates a fake google map object,
 * that intercepts API calls and creates a GeoJson structure.
 */
function init () {
    events = []

    var contentPlaceholder = null;
    var id = 133713371337;
    var timeRegexp = /\/>([0-9]+[:.][0-9]+) - ([0-9]+[:.][0-9]+) val\./;
    var descAndLinkRegexp = /<strong>.*<br\/>(.*)<br\/><br\/><a href="(.*)">Daugiau/;

    function toNumerical(timeString, from) {
        if (timeString == '?') {
            return from ? 0 : 30;
        } else {
            var parts = timeString.split(/[:.]/);
            var hours = parseInt(parts[0]);
            var minutes = parseInt(parts[1]) / 60;
            return hours + minutes;
        }
    }

    google = {
        maps: {
            MarkerImage: function(imageUrl) {
                this.imageUrl = imageUrl;
            },
            LatLng: function(lat, lng) {
                this.lat = lat;
                this.lng = lng;
            },
            Marker: function(args) {
                this.args = args;
                this.setTitle = function(title) {
                    this.title = title;
                }
            },
            MapTypeId: {
                ROADMAP: 0
            },
            event: {
                addListener: function(marker, event, func) {
                    func();
                    var time = timeRegexp.exec(contentPlaceholder) || [null, '?','?'];
                    var descAndLink = descAndLinkRegexp.exec(contentPlaceholder) || [null, contentPlaceholder, null];
                    events.push({
                        title: marker.title,
                        type: marker.args.icon.imageUrl.split('/').pop().split('.')[0],
                        icon: marker.args.icon.imageUrl,
                        from: time[1],
                        fromNumerical: toNumerical(time[1], true),
                        until: time[2],
                        untilNumerical: toNumerical(time[2], false),
                        description: descAndLink[1],
                        link: "http://www.kulturosnaktis.lt" + (descAndLink[2] || ""),
                        id: parseInt((descAndLink[2] || String(id++)).split("/").pop()),
                        lat: marker.args.position.lat,
                        lng: marker.args.position.lng
                    });
                }
            },
            InfoWindow: function() {
                this.setContent = function(content) {
                    contentPlaceholder = content
                       .replace(/&bdquo;/g, '„')
                       .replace(/&ldquo;/g, '“')
                       .replace(/&rsquo;/g, '’')
                       .replace(/&scaron;/g, 'š')
                       .replace(/&Scaron;/g, 'Š')
                       .replace(/&ndash;/g, '–')
                       .replace(/&lt;/g, '<')
                       .replace(/&hellip;/g, '…')
                       .replace(/&#039;/g, "'")
                       .replace(/&quot;/g, '"')
                       .replace(/&yacute;/g, 'ý');
                }
                this.open = function() {}
            },
            Size: function() {},
            Point: function() {},
            Map: function() {}
        }
    };

    window.get = function() {}

    eventsGeoJson = function() {
        function toGeoJson(event) {
            return {
                "id": event.id,
                "type": "Feature",
                "properties": {
                    "title": event.title,
                    "from": event.from,
                    "fromNumerical": event.fromNumerical,
                    "until": event.until,
                    "untilNumerical": event.untilNumerical,
                    "description": event.description,
                    "link": event.link,
                    "type": event.type,
                    "icon": event.icon
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [
                        event.lng,
                        event.lat
                    ]
                }
            };
        }

        var geoJson = {
            type: "FeatureCollection",
            features: events.map(toGeoJson)
        }

        return JSON.stringify(geoJson, null, 2);
    }
}

// Intercept google maps script
checkForBadJavascripts ( [
    [true, /google/i, function () {addJS_Node (null, null, init);} ]
] );
