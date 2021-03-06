package org.onebusaway.nyc.transit_data_manager.adapters.input.readers;

import java.io.IOException;
import java.util.List;

import org.onebusaway.nyc.transit_data_manager.adapters.input.model.MtaBusDepotAssignment;

public interface BusDepotAssignsInputConverter {
  List<MtaBusDepotAssignment> getBusDepotAssignments() throws IOException;
}
