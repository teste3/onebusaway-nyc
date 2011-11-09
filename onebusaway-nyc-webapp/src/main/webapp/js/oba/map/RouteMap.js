/*
 * Copyright (c) 2011 Metropolitan Transportation Authority
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

var OBA = window.OBA || {};

OBA.RouteMap = function(mapNode, mapMoveCallbackFn) {	
	var mtaSubwayMapType = new google.maps.ImageMapType({
		getTileUrl: function(coord, zoom) {
			if(!(zoom >= this.minZoom && zoom <= this.maxZoom)) {
				return null;
			}

			var quad = ""; 
		    for (var i = zoom; i > 0; i--){
		        var mask = 1 << (i - 1); 
		        var cell = 0; 
		        if ((coord.x & mask) != 0) 
		            cell++; 
		        if ((coord.y & mask) != 0) 
		            cell += 2; 
		        quad += cell; 
		    } 
			return 'http://tripplanner.mta.info/maps/SystemRoutes_New/' + quad + '.png'; 
		},
		tileSize: new google.maps.Size(256, 256),
		opacity: 0.5,
		maxZoom: 15,
		minZoom: 14,
		name: 'MTA Subway Map',
		isPng: true,
		alt: ''
	});

	var mutedTransitStylesArray = 
		[{
			featureType: "road.arterial",
			elementType: "geometry",
			stylers: [
			          { saturation: -100 },
			          { lightness: 100 },
			          { visibility: "simplified" },
			          { hue: "#ffffff" }
			          ]
		},{
			featureType: "road.highway",
			elementType: "geometry",
			stylers: [
			          { saturation: -80 },
			          { lightness: 60 },
			          { visibility: "on" },
			          { hue: "#0011FF" }
			          ]
		},{
			featureType: "road.local",
			elementType: "geometry",
			stylers: [
			          { saturation: 0 },
			          { lightness: 100 },
			          { visibility: "on" },
			          { hue: "#ffffff" }
			          ]
		},{
			featureType: "road.arterial",
			elementType: "labels",
			stylers: [
			          { lightness: 25 },
			          { saturation: -25 },
			          { visibility: "off" },
			          { hue: "#ddff00" }
			          ]
		},{
			featureType: "road.highway",
			elementType: "labels",
			stylers: [
			          { lightness: 60 },
			          { saturation: -70 },
			          { hue: "#0011FF" },
			          { visibility: "on" }
			          ]
		},{ 
			featureType: "administrative.locality", 
			elementyType: "labels",
			stylers: [ { visibility: "on" }, 
			           { lightness: 50 },
			           { saturation: -80 }, 
			           { hue: "#ffff00" } ] 
		},{ 
			featureType: "administrative.neighborhood", 
			elementyType: "labels",
			stylers: [ { visibility: "on" }, 
			           { lightness: 50 },
			           { saturation: -80 }, 
			           { hue: "#ffffff" } ] 
		},{
			featureType: 'landscape',
			elementType: 'labels',
			stylers: [ {'visibility': 'on'},
			           { lightness: 50 },
			           { saturation: -80 },
			           { hue: "#0099ff" }
			           ]
		},{
			featureType: 'poi',
			elementType: 'labels',
			stylers: [ {'visibility': 'on'},
			           { lightness: 50 },
			           { saturation: -80 },
			           { hue: "#0099ff" }
			           ]
		},{
			featureType: 'water',
			elementType: 'labels',
			stylers: [ {'visibility': 'off'}
			]
		}];

	var transitStyledMapType = 
		new google.maps.StyledMapType(mutedTransitStylesArray, {name: "Transit"});
	
	var defaultMapOptions = {
			zoom: 11,
			mapTypeControl: false,
			streetViewControl: false,
			zoomControl: true,
			zoomControlOptions: {
				style: google.maps.ZoomControlStyle.LARGE
			},
			minZoom: 9, 
			maxZoom: 19,
			navigationControlOptions: { style: google.maps.NavigationControlStyle.DEFAULT },
			center: new google.maps.LatLng(40.639228,-74.081154)
	};

	var map = null;
	var mgr = null;
	var infoWindow = null;

	var disambiguationMarkers = [];
	var vehiclesByRoute = {};
	var vehiclesById = {};
	var polylinesByRoute = {};
	var stopsAddedForRoute = {};
	var stopsByIdReferenceCount = {}; // (number of routes on map a stop is associated with)
	var stopsById = {};
	var hoverPolylines = [];

	// POPUPS	
	function showPopupWithContent(marker, content) {
		// only one popup open at a time!
		var closeFn = function() {
			if(infoWindow !== null) {
				infoWindow.close();
			}
		};
		closeFn();

		infoWindow = new google.maps.InfoWindow({
	    	content: content,
	    	pixelOffset: new google.maps.Size(0, (marker.getIcon().size.height / 2))
	    });

		infoWindow.open(map, marker);
    
		google.maps.event.addListener(infoWindow, "closeclick", closeFn);
	}
	
	function showPopupWithContentFromRequest(marker, url, params, contentFn, userData) {
		showPopupWithContent(marker, "Loading...");
		
		var refreshFn = function() {
			jQuery.getJSON(url, params, function(json) {
				infoWindow.setContent(contentFn(json, userData));
			});
		};
		refreshFn();		

		// this method will be called regularly by the update timer
		infoWindow.refreshFn = refreshFn;	
	}
	
	// return html for a SIRI VM response
	function getVehicleContentForResponse(r) {
		var activity = r.ServiceDelivery.VehicleMonitoringDelivery[0].VehicleActivity[0];

		if(activity === null) {
			return null;
		}

		var vehicleId = activity.MonitoredVehicleJourney.VehicleRef;
		var vehicleIdParts = vehicleId.split("_");
		var vehicleIdWithoutAgency = vehicleIdParts[1];

		var routeId = activity.MonitoredVehicleJourney.LineRef;
		var routeIdParts = routeId.split("_");
		var routeIdWithoutAgency = routeIdParts[1];

		var html = '<div id="popup">';
		
		// header
		html += ' <div class="header vehicle">';
		html += '  <p class="title">' + routeIdWithoutAgency + " " + activity.MonitoredVehicleJourney.PublishedLineName + '</p><p>';
		html += '   <span class="type">Vehicle #' + vehicleIdWithoutAgency + '</span>';

		// update time
		var updateTimestamp = new Date(activity.RecordedAtTime).getTime();
		var updateTimestampReference = new Date(r.ServiceDelivery.ResponseTimestamp).getTime();
		html += '   <span class="updated">Last updated ' + OBA.Util.displayTime((updateTimestampReference - updateTimestamp) / 1000) + '</span>'; 
		
		// (end header)
		html += '  </p>';
		html += ' </div>';
		
		// service available at stop
		if(typeof activity.MonitoredVehicleJourney.MonitoredCall === 'undefined' 
			|| typeof activity.MonitoredVehicleJourney.OnwardCalls === 'undefined') {

			html += '<p class="service">Next stops are not known for this vehicle.</p>';
		} else {		
			var nextStops = [];
			nextStops.push(activity.MonitoredVehicleJourney.MonitoredCall);
			jQuery.each(activity.MonitoredVehicleJourney.OnwardCalls.OnwardCall, function(_, onwardCall) {
				if(nextStops.length >= 3) {
					return false;
				}
				nextStops.push(onwardCall);
			});
		
			html += '<p class="service">Next stops:</p>';
			html += '<ul>';
			jQuery.each(nextStops, function(_, call) {
				html += '<li class="nextStop">' + call.StopPointName + ' <span>';
				html +=   call.Extensions.distances.presentableDistance;
				html += '</span></li>';
			});
			html += '</ul>';
		}
	
		// (end popup)
		html += '</div>';
		
		return html;
	}
	
	function getStopContentForResponse(r, stopItem) {
		var visits = r.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit;
		
		if(visits === null) {
			return null;
		}
		
		var html = '<div id="popup">';
		
		// header
		html += ' <div class="header stop">';
		html += '  <p class="title">' + stopItem.name + '</p><p>';
		html += '   <span class="type">Stop #' + stopItem.stopIdWithoutAgency + '</span>';

		// update time across all arrivals
		var age = null;
		var updateTimestampReference = new Date(r.ServiceDelivery.ResponseTimestamp).getTime();
		jQuery.each(visits, function(_, monitoredJourney) {
			var updateTimestamp = new Date(monitoredJourney.RecordedAtTime).getTime();
			var thisAge = (updateTimestampReference - updateTimestamp) / 1000;
			if(thisAge > age) {
				age = thisAge;
			}
		});
		if(age !== null) {
			html += '   <span class="updated">Last updated ' + OBA.Util.displayTime(age) + '</span>'; 
		}
		
		// (end header)
		html += '  </p>';
		html += ' </div>';
		
		// service available
		if(visits.length === 0) {
			html += '<p class="service">No buses en-route to your location.<br/>Please check back shortly for an update.</p>';
		} else {		
			html += '<p class="service">This stop is served by:</p>';
			html += '<ul>';

			var arrivalsByRouteAndHeadsign = {};
			jQuery.each(visits, function(_, monitoredJourney) {
				var routeId = monitoredJourney.MonitoredVehicleJourney.LineRef;
				var routeIdParts = routeId.split("_");
				var routeIdWithoutAgency = routeIdParts[1];
				
				var key = routeIdWithoutAgency + " " + monitoredJourney.MonitoredVehicleJourney.PublishedLineName;
				if(typeof arrivalsByRouteAndHeadsign[key] === 'undefined') {
					arrivalsByRouteAndHeadsign[key] = [];
				}

				arrivalsByRouteAndHeadsign[key].push(monitoredJourney.MonitoredVehicleJourney.MonitoredCall);
			});
		
			jQuery.each(arrivalsByRouteAndHeadsign, function(routeLabel, monitoredCalls) {
				html += '<li class="route">' + routeLabel + '</li>';

				jQuery.each(monitoredCalls, function(_, monitoredCall) {
					if(_ >= 3) {
						return false;
					}
					html += '<li class="arrival">' + monitoredCall.Extensions.distances.presentableDistance + '</li>';
				});
			});
			html += '</ul>';
		}
		
		// (end popup)
		html += '</div>';
		
		return html;
	}
	
	// POLYLINE
	function removePolylines(routeId) {
		if(typeof polylinesByRoute[routeId] !== 'undefined') {
			var polylines = polylinesByRoute[routeId];

			jQuery.each(polylines, function(_, polyline) {
				polyline.setMap(null);
			});
			
			delete polylinesByRoute[routeId];
		}
	}
	
	function addPolylines(routeId, encodedPolylines, color) {
		if(typeof polylinesByRoute[routeId] === 'undefined') {
			polylinesByRoute[routeId] = [];
		}

		jQuery.each(encodedPolylines, function(_, encodedPolyline) {
			var points = OBA.Util.decodePolyline(encodedPolyline);
		
			var latlngs = jQuery.map(points, function(x) {
				return new google.maps.LatLng(x[0], x[1]);
			});

			var options = {
				path: latlngs,
				strokeColor: "#" + color,
				strokeOpacity: 1.0,
				strokeWeight: 3,
				map: map
			};
			
			var shape = new google.maps.Polyline(options);

			// used when changing the line color FIXME 
			shape.originalPath = latlngs;
			shape.originalColor = "#" + color;
			
			polylinesByRoute[routeId].push(shape);
		});	
	}

	// STOPS
	function removeStops(routeId) {
		if(typeof stopsAddedForRoute[routeId] !== 'undefined') {
			var stops = stopsAddedForRoute[routeId];
			
			jQuery.each(stops, function(_, marker) {
				var stopId = marker.stopId;
				stopsByIdReferenceCount[stopId]--;
				
				if(stopsByIdReferenceCount[stopId] === 0) {
					delete stopsByIdReferenceCount[stopId];
					delete stopsById[stopId];				
					mgr.removeMarker(marker);
					marker.setMap(null);
				}
			});
			
			delete stopsAddedForRoute[routeId];
		}		
	}
	
	function addStops(routeId, stopItems) {
		if(typeof stopsAddedForRoute[routeId] === 'undefined') {
			stopsAddedForRoute[routeId] = [];
		}

		jQuery.each(stopItems, function(_, stop) {
			var stopId = stop.stopId;
			var name = stop.name;
			var latitude = stop.latitude;
			var longitude = stop.longitude;
			var direction = stop.stopDirection;
			
			// does the stop arleady exist, e.g. from another route?
			if(typeof stopsById[stopId] !== 'undefined') {
				stopsAddedForRoute[routeId].push(stopsById[stopId]);
				stopsByIdReferenceCount[stopId]++;
				return;
			}
			
			// if we get here, we're adding a new stop marker:
			var directionKey = direction;
			if(directionKey === null) {
				directionKey = "unknown";
			}
			
			var icon = new google.maps.MarkerImage("img/stop/stop-" + directionKey + ".png",
                new google.maps.Size(21, 21),
                new google.maps.Point(0,0),
                new google.maps.Point(10, 10));
			
			var markerOptions = {
				position: new google.maps.LatLng(latitude, longitude),
	            icon: icon,
	            zIndex: 1,
	            title: name,
	            stopId: stopId
			};

	        var marker = new google.maps.Marker(markerOptions);
	        
	    	google.maps.event.addListener(marker, "click", function(mouseEvent) {
	    		var stopIdParts = stopId.split("_");
	    		var agencyId = stopIdParts[0];
	    		var stopIdWithoutAgency = stopIdParts[1];

	    		showPopupWithContentFromRequest(this, OBA.Config.siriSMUrl, 
	    				{ OperatorRef: agencyId, MonitoringRef: stopIdWithoutAgency, StopMonitoringDetailLevel: "normal" }, 
	    				getStopContentForResponse, stop);
	    	});

	    	// FIXME: route zoom level configuration?
	    	mgr.addMarker(marker, 16, 19);
	    
	        stopsAddedForRoute[routeId].push(marker);
	    	stopsByIdReferenceCount[stop.stopId] = 1;
	        stopsById[stop.stopId] = marker;
	    });
	}
	
	// VEHICLES
	function updateVehicles(routeId) {
		if(typeof vehiclesByRoute[routeId] === 'undefined') {
			vehiclesByRoute[routeId] = {};
		}
		
		var routeIdParts = routeId.split("_");
		var agencyId = routeIdParts[0];
		var routeIdWithoutAgency = routeIdParts[1];
		
		jQuery.getJSON(OBA.Config.siriVMUrl + "?callback=?", { OperatorRef: agencyId, LineRef: routeIdWithoutAgency }, 
		function(json) {

			var vehiclesByIdInResponse = {};
			jQuery.each(json.ServiceDelivery.VehicleMonitoringDelivery[0].VehicleActivity, function(_, activity) {

				var latitude = activity.MonitoredVehicleJourney.VehicleLocation.Latitude;
				var longitude = activity.MonitoredVehicleJourney.VehicleLocation.Longitude;
				var orientation = activity.MonitoredVehicleJourney.Bearing;
				var headsign = activity.MonitoredVehicleJourney.PublishedLineName;

				var vehicleId = activity.MonitoredVehicleJourney.VehicleRef;
				var vehicleIdParts = vehicleId.split("_");
				var vehicleIdWithoutAgency = vehicleIdParts[1];

				var marker = vehiclesById[vehicleId];

				// create marker if it doesn't exist				
				if(typeof marker === 'undefined' || marker === null) {
					var markerOptions = {
				            zIndex: 2,
							map: map,
							title: routeIdWithoutAgency + " " + headsign,
							vehicleId: vehicleId,
							routeId: routeId
					};

					marker = new google.maps.Marker(markerOptions);
			        
			    	google.maps.event.addListener(marker, "click", function(mouseEvent) {
			    		showPopupWithContentFromRequest(this, OBA.Config.siriVMUrl, 
			    				{ OperatorRef: agencyId, VehicleRef: vehicleIdWithoutAgency, VehicleMonitoringDetailLevel: "calls" }, 
			    				getVehicleContentForResponse, null);
			    	});
				}

				// icon
				var orientationAngle = "unknown";
				if(orientation !== null && orientation !== 'NaN') {
					orientationAngle = Math.floor(orientation / 5) * 5;
				}
					
				var icon = new google.maps.MarkerImage("img/vehicle/vehicle-" + orientationAngle + ".png",
						new google.maps.Size(51, 51),
						new google.maps.Point(0,0),
						new google.maps.Point(25, 25));

				marker.setIcon(icon);

				// position
				var position = new google.maps.LatLng(latitude, longitude);
				marker.setPosition(position);
							    	
				// (mark that this vehicle is still in the response)
				vehiclesByIdInResponse[vehicleId] = true;

				// maps used to keep track of marker
				vehiclesByRoute[routeId][vehicleId] = marker;
				vehiclesById[vehicleId] = marker; 
			});
			
			// remove vehicles from map that are no longer in the response, for all routes in the query
			jQuery.each(vehiclesById, function(vehicleOnMap_vehicleId, vehicleOnMap) {
				if(typeof vehiclesByIdInResponse[vehicleOnMap_vehicleId] === 'undefined') {
					var vehicleOnMap_routeId = vehicleOnMap.routeId;
					
					// the route of the vehicle on the map wasn't in the query, so don't check it.
					if(routeId !== vehicleOnMap_routeId) {
						return;
					}
					
					vehicleOnMap.setMap(null);
					delete vehiclesById[vehicleOnMap_vehicleId];
					delete vehiclesByRoute[vehicleOnMap_routeId][vehicleOnMap_vehicleId];
				}
			});
		});
	}
	
	function removeVehicles(routeId) {
		if(typeof vehiclesByRoute[routeId] !== 'undefined') {
			var vehicles = vehiclesByRoute[routeId];
			
			jQuery.each(vehicles, function(_, marker) {
				var vehicleId = marker.vehicleId;
				
				marker.setMap(null);
				delete vehiclesById[vehicleId];
			});

			delete vehiclesByRoute[routeId];
		};
	};
	
	// MISC
	function removeRoutesNotInSet(routeResults) {
		for(routeAndAgencyId in polylinesByRoute) {
			if(routeAndAgencyId === null) {
				continue;
			}

			// don't remove the routes we just added!
			var removeMe = true;
			jQuery.each(routeResults, function(_, result) {
				if(routeAndAgencyId === result.routeId) {
					removeMe = false;
					return false;
				}				
			});
			
			if(removeMe) {			
				removePolylines(routeAndAgencyId);
				removeStops(routeAndAgencyId);
				removeVehicles(routeAndAgencyId);
			}
		}		
	}
	
	function removeDisambiguationMarkers() {
		jQuery.each(disambiguationMarkers, function(_, marker) {
			marker.setMap(null);
		});
	}
		
	//////////////////// CONSTRUCTOR /////////////////////
	map = new google.maps.Map(mapNode, defaultMapOptions);
	mgr = new MarkerManager(map);

	// mta custom tiles
	map.overlayMapTypes.insertAt(0, mtaSubwayMapType);
	
	// styled basemap
	map.mapTypes.set('Transit', transitStyledMapType);
	map.setMapTypeId('Transit');
		
	// request list of routes in viewport when user stops moving map
	if(typeof mapMoveCallbackFn === 'function') {
		google.maps.event.addListener(map, "idle", mapMoveCallbackFn);
	}
	
	// timer to update periodically
	setInterval(function() {
		jQuery.each(vehiclesByRoute, function(routeId, vehicles) {
			updateVehicles(routeId);
		});

		if(infoWindow !== null && infoWindow.refreshFn != null) {
			infoWindow.refreshFn();
		}
	}, OBA.Config.refreshInterval);

	//////////////////// PUBLIC INTERFACE /////////////////////
	return {
		getBounds: function() {
			return map.getBounds();
		},
		
		removeAllRoutes: function() {
			removeRoutesNotInSet({});
		},
		
		showPopupForStopId: function(stopId) {
			var stopMarker = stopsById[stopId];
			
			if(typeof stopMarker === 'undefined') {
				return;
			}
			
			google.maps.event.trigger(stopMarker, "click");
		},
		
		removeRoutesNotInSet: removeRoutesNotInSet,
		
		showRoute: function(routeResult) {
			// already on map
			if(typeof polylinesByRoute[routeResult.routeId] !== 'undefined') {
				return
			}
			
			jQuery.each(routeResult.destinations, function(_, destination) {
				addPolylines(routeResult.routeId, destination.polylines, routeResult.color);
				addStops(routeResult.routeId, destination.stops);
			});

			updateVehicles(routeResult.routeId);
		},

		setRouteStatus: function(routeId, enabled) {
			var polylines = polylinesByRoute[routeId];
			
			if(typeof polylines === 'undefined') {
				return;
			}
			
			// FIXME: better way to change polylines?
			jQuery.each(polylines, function(_, polyline) {
				if(enabled === false) {
					var newOptions = {
							strokeColor: "#EFEFEF",
							strokeOpacity: 1.0,
							strokeWeight: 3,
							map: map,
							path: polyline.originalPath
					};
					polyline.setOptions(newOptions);

					removeVehicles(routeId);
				} else {
					var newOptions = {
							strokeColor: polyline.originalColor,
							strokeOpacity: 1.0,
							strokeWeight: 3,
							map: map,
							path: polyline.originalPath
					};
					polyline.setOptions(newOptions);
					
					updateVehicles(routeId);
				}
			});
		},
		
		removeHoverPolyline: function() {
			if(hoverPolylines !== null) {
				jQuery.each(hoverPolylines, function(_, polyline) {
					polyline.setMap(null);
				});
			}
			hoverPolylines = null;
		},
		
		showHoverPolyline: function(encodedPolylines, color) {
			hoverPolylines = [];
			jQuery.each(encodedPolylines, function(_, encodedPolyline) {
				var points = OBA.Util.decodePolyline(encodedPolyline);
			
				var latlngs = jQuery.map(points, function(x) {
					return new google.maps.LatLng(x[0], x[1]);
				});

				var shape = new google.maps.Polyline({
					path: latlngs,
					strokeColor: "#" + color,
					strokeOpacity: 0.7,
					strokeWeight: 3,
					map: map
				});
			
				hoverPolylines.push(shape);
			});
		},
		
		showBounds: function(bounds) {
			map.fitBounds(bounds);
		},

		showLocation: function(lat, lng) {
			var location = new google.maps.LatLng(lat, lng);
			map.panTo(location);
			map.setZoom(16);
		},
		
		removeDisambiguationMarkers: removeDisambiguationMarkers,
		
		addDisambiguationMarkerWithContent: function(latlng, address, neighborhood) {
			var icon = new google.maps.MarkerImage("img/location/beachflag.png",
	                new google.maps.Size(20, 32),
	                new google.maps.Point(0,0),
	                new google.maps.Point(10, -32));
				
			var markerOptions = {
					position: latlng,
		            icon: icon,
		            zIndex: 2,
		            title: address,
		            map: map
			};

		    var marker = new google.maps.Marker(markerOptions);
		    disambiguationMarkers.push(marker);
		    
	    	google.maps.event.addListener(marker, "click", function(mouseEvent) {
	    		var content = '<h3><b>' + address + '</b></h3>';

	    		if(neighborhood !== null) {
	    			content += neighborhood;
	    		}
	    		
	    		showPopupWithContent(marker, content);
	    	});
	    	
	    	return marker;
		}
	};
};