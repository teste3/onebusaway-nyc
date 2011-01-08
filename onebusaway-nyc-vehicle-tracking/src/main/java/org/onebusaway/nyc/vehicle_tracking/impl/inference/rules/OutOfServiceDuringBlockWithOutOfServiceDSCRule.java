package org.onebusaway.nyc.vehicle_tracking.impl.inference.rules;

import static org.onebusaway.nyc.vehicle_tracking.impl.inference.rules.Logic.implies;
import static org.onebusaway.nyc.vehicle_tracking.impl.inference.rules.Logic.p;

import org.onebusaway.geospatial.model.CoordinatePoint;
import org.onebusaway.geospatial.services.SphericalGeometryLibrary;
import org.onebusaway.nyc.vehicle_tracking.impl.inference.Observation;
import org.onebusaway.nyc.vehicle_tracking.impl.inference.state.BlockState;
import org.onebusaway.nyc.vehicle_tracking.impl.inference.state.VehicleState;
import org.onebusaway.realtime.api.EVehiclePhase;
import org.onebusaway.transit_data_federation.services.blocks.ScheduledBlockLocation;
import org.springframework.stereotype.Component;

/**
 * Out-of-service DSC ^ on route ^ service left on the block => DEADHEAD_DURING
 * v LAYOVER_DURING
 * 
 * @author bdferris
 * 
 */
@Component
public class OutOfServiceDuringBlockWithOutOfServiceDSCRule implements
    SensorModelRule {

  @Override
  public double likelihood(SensorModelSupportLibrary library, Context context) {

    Observation obs = context.getObservation();

    boolean outOfServiceDsc = library.isOutOfServiceDestinationSignCode(obs);

    // Short circuit - must be out-of-service DSC for rule to apply
    if (!outOfServiceDsc)
      return 1.0;

    VehicleState state = context.getState();
    BlockState blockState = state.getBlockState();

    // Short circuit - must have block assignment for rule to apply
    if (blockState == null)
      return 1.0;

    double pOnRoute = computeOnRouteLikelihood(context.getObservation(),
        blockState);

    EVehiclePhase phase = state.getJourneyState().getPhase();
    double pOutOfServiceDuringPhase = p(phase == EVehiclePhase.DEADHEAD_DURING
        || phase == EVehiclePhase.LAYOVER_DURING);

    return implies(pOnRoute, pOutOfServiceDuringPhase);
  }

  private double computeOnRouteLikelihood(Observation obs, BlockState blockState) {

    ScheduledBlockLocation blockLocation = blockState.getBlockLocation();
    CoordinatePoint location = blockLocation.getLocation();

    double d = SphericalGeometryLibrary.distance(location, obs.getLocation());

    /**
     * TODO: Maybe a distribution here?
     */
    if (d < 100)
      return 1.0;

    return 0.25;
  }
}