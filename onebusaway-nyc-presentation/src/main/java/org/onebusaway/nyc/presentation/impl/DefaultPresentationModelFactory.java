package org.onebusaway.nyc.presentation.impl;

import org.onebusaway.nyc.presentation.model.search.RouteDestinationItem;
import org.onebusaway.nyc.presentation.model.search.RouteResult;
import org.onebusaway.nyc.presentation.model.search.StopResult;
import org.onebusaway.nyc.presentation.service.PresentationModelFactory;
import org.onebusaway.transit_data.model.RouteBean;
import org.onebusaway.transit_data.model.StopBean;
import org.onebusaway.transit_data.model.StopGroupBean;

import java.util.ArrayList;
import java.util.List;

public class DefaultPresentationModelFactory implements PresentationModelFactory {
  
  public StopResult getStopModel(StopBean stopBean, List<RouteResult> routesAvailable) {
    return new StopResult(stopBean, routesAvailable);
  }

  public StopResult getStopModelForRoute(StopBean stopBean, RouteBean route) {
    List<RouteResult> routesAvailable = new ArrayList<RouteResult>();
    for(RouteBean routeBean : stopBean.getRoutes()) {
      // skip the route this stop is part of!
      if(routeBean.getId().equals(route.getId()))
        continue;
      
      routesAvailable.add(getRouteModel(routeBean, null));
    }
    return new StopResult(stopBean, routesAvailable);
  }
  
  public RouteResult getRouteModel(RouteBean routeBean, List<RouteDestinationItem> destinations) {
    return new RouteResult(routeBean, destinations);
  }
  
  public RouteResult getRouteModelForStop(RouteBean routeBean, List<RouteDestinationItem> destinations) {
    return new RouteResult(routeBean, destinations);
  }

  public RouteDestinationItem getRouteDestinationModelForRoute(StopGroupBean group, RouteBean route, List<StopResult> stops) {
    return new RouteDestinationItem(group, stops);
  }

  public RouteDestinationItem getRouteDestinationModelForStop(StopGroupBean group, RouteBean route, StopBean stop) {
    return new RouteDestinationItem(group, null);
  }
  
}