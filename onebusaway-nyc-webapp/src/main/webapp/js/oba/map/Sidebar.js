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

OBA.Sidebar = function() {
	var theWindow = null;
	var headerDiv, footerDiv, contentDiv = null;

	var routeMap = OBA.RouteMap(document.getElementById("map"));

	var welcome = jQuery("#welcome");
	var legend = jQuery("#legend");
	var results = jQuery("#results");
	var noResults = jQuery("#no-results");

	function addSearchBehavior() {
		var searchForm = jQuery("#search");
		var searchInput = jQuery("#search input[type=text]");
		
		searchForm.submit(function(e) {
			e.preventDefault();
			
			doSearch(searchInput.val());

			OBA.Config.analyticsFunction("Search", searchInput.val());
		});
	}

	function addResizeBehavior() {
		theWindow = jQuery(window);
		headerDiv = jQuery("#header");
		footerDiv = jQuery("#footer");
		contentDiv = jQuery("#content");
		searchBarDiv = jQuery("#searchbar");
		
		function resize() {
			var h = theWindow.height() - footerDiv.height() - headerDiv.height();
			contentDiv.height(h);
			searchBarDiv.height(h);
		}

		// call when the window is resized
		theWindow.resize(resize);

		// call upon initial load
		resize();

		// now that we're resizing, we can hide any body overflow/scrollbars
		jQuery("body").css("overflow", "hidden");
	}

	// show user list of addresses
	function disambiguate(locationResults) {
		legend.hide();
		results.show();

		var bounds = null;
		var resultsList = jQuery("#results ul");
		jQuery.each(locationResults, function(_, location) {
			var latlng = new google.maps.LatLng(location.latitude, location.longitude);
			var address = location.formattedAddress;
			var neighborhood = location.neighborhood;
			
			var marker = routeMap.addDisambiguationMarkerWithContent(latlng, address, neighborhood);

		    // sidebar item
			var link = jQuery("<a href='#'></a>")
							.text(address);

			var listItem = jQuery("<li></li>")
							.addClass("locationItem")
							.append(link);

			resultsList.append(listItem);

			link.click(function(e) {
				e.preventDefault();

				var link = jQuery(this);
				var searchForm = jQuery("#search");
				var searchInput = jQuery("#search input[type=text]");

				searchInput.val(link.text());
				searchForm.submit();
			});

			link.hover(function() {
				marker.setAnimation(google.maps.Animation.BOUNCE);
			}, function() {
				marker.setAnimation(null);
			});

			// calculate extent of all options
			if(bounds === null) {
				bounds = new google.maps.LatLngBounds(latlng, latlng);
			} else {
				bounds.extend(latlng);
			}
		});
		
		routeMap.showBounds(bounds);
	}

	// display (few enough) routes on map and in legend
	function showRoutesOnMap(routeResults) {
		legend.show();
		results.hide();

		var legendList = jQuery("#legend ul");
		jQuery.each(routeResults, function(_, routeResult) {	
			var checkBox = jQuery("<input type='checkbox' checked></input>");
			
			var titleBox = jQuery("<span></span>")
							.addClass("routeName")
							.text(routeResult.routeIdWithoutAgency + " " + routeResult.description)
							.css("color", "#" + routeResult.color);

			var listItem = jQuery("<li></li>")
							.addClass("legendItem")
							.append(checkBox)
							.append(titleBox);

			legendList.append(listItem);

			checkBox.click(function(e) {
				var checkbox = jQuery(this);
				var enabled = checkbox.attr("checked");
				
				routeMap.setRouteStatus(routeResult.routeId, enabled);
			});
			
			// directions
			jQuery.each(routeResult.destinations, function(_, destination) {
				var directionHeader = jQuery("<p></p>")
											.text("to " + destination.headsign);

				var stopsList = jQuery("<ul></ul>")
											.addClass("stops");

				var destinationContainer = jQuery("<p></p>")
											.addClass("destination")
											.append(directionHeader)
											.append(stopsList);

				// stops for this destination
				jQuery.each(destination.stops, function(__, stop) {
					var stopLink = jQuery("<a href='#'></a>")
									.text(stop.name);
					
					var stopItem = jQuery("<li></li>")
									.append(stopLink);
	
					stopsList.append(stopItem);

					stopLink.click(function(e) {
						e.preventDefault();
						routeMap.showPopupForStopId(stop.stopId);
					});
				});

				// accordion-ize
				destinationContainer.accordion({ header: 'p', 
					collapsible: true, 
					active: false, 
					autoHeight: false });
				
				listItem.append(destinationContainer);
			});

			routeMap.showRoute(routeResult);
		});
	}

	// show many (too many to show on map) routes to user
	function showRoutePickerList(routeResults) {
		legend.hide();
		results.show();

		var resultsList = jQuery("#results ul");
		jQuery.each(routeResults, function(_, route) {
			var link = jQuery("<a href='#'></a>")
							.text(route.name)
							.attr("title", route.description);

			var listItem = jQuery("<li></li>")
							.addClass("routeItem")
							.append(link);
			
			resultsList.append(listItem);

			// polyline hover
			var allPolylines = [];
			jQuery.each(route.destinations, function(__, destination) {
				jQuery.each(destination.polylines, function(___, polyline) {
					allPolylines.push(polyline);
				});
			});
			
			link.hover(function() {
				routeMap.showHoverPolyline(allPolylines, route.color);
			}, function() {
				routeMap.removeHoverPolyline();
			});
			
			// search link handler
			link.click(function(e) {
				e.preventDefault();
				
				var link = jQuery(this);
				var searchForm = jQuery("#search");
				var searchInput = jQuery("#search input[type=text]");
				
				searchInput.val(link.text());
				searchForm.submit();
			});
		});
	}

	// process search results
	function doSearch(q) {
		welcome.hide();
		legend.hide();
		results.show();

		var resultsList = jQuery("#results ul");
		var legendList = jQuery("#legend ul");

		legendList.empty();
		resultsList.empty();
		routeMap.removeAllRoutes();
		routeMap.removeDisambiguationMarkers();
		
		jQuery.getJSON(OBA.Config.searchUrl + "?callback=?", {q: q }, function(json) { 
			var resultCount = json.searchResults.length;
			if(resultCount === 0) {
				legend.hide();
				results.hide();

				noResults.show();
				return;
			} else {
				noResults.hide();
			}

			var resultType = json.searchResults[0].type;			
			if(resultCount === 1) {
				if(resultType === "locationResult" || resultType === "stopResult") {
					var result = json.searchResults[0];

					// region (zip code or borough)
					if(resultType === "locationResult" && result.region === true) {
						var bounds = result.bounds;
						var latLngBounds = new google.maps.LatLngBounds(
								new google.maps.LatLng(bounds.minLat, bounds.minLon), 
								new google.maps.LatLng(bounds.maxLat, bounds.maxLon));
						
						showRoutePickerList(result.nearbyRoutes);
						routeMap.showBounds(latLngBounds);

					// intersection or stop ID
					} else {
						showRoutesOnMap(result.nearbyRoutes);

						if(resultType === "stopResult") {
							routeMap.showPopupForStopId(result.stopId);
						} else {
							routeMap.showLocation(result.latitude, result.longitude);
						}
					}
					
				// single route
				} else if(resultType === "routeResult") {
					showRoutesOnMap(json.searchResults);
				}
			} else {
				// location disambiguation
				if(resultType === "locationResult") {
					disambiguate(json.searchResults);
				}
			}
		});		
	}
	
	return {
		initialize: function() {
			addSearchBehavior();
			addResizeBehavior();
			
			// deep link handler
			jQuery.history.init(function(hash) {
            	if(hash !== null && hash !== "") {
					var searchForm = jQuery("#search");
					var searchInput = jQuery("#search input[type=text]");
					
					searchInput.val(hash);
					searchForm.submit();

            		OBA.Config.analyticsFunction("Deep Link", hash);
            	}
            });	
		}
	};
};

jQuery(document).ready(function() { OBA.Sidebar().initialize(); });