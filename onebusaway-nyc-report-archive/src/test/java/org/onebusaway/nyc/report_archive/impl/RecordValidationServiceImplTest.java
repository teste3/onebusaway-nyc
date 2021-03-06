package org.onebusaway.nyc.report_archive.impl;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;

import lrms_final_09_07.Angle;

import org.junit.Before;
import org.junit.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.onebusaway.nyc.queue.model.RealtimeEnvelope;
import org.onebusaway.nyc.transit_data.model.NycQueuedInferredLocationBean;
import org.onebusaway.nyc.transit_data.model.NycVehicleManagementStatusBean;

import tcip_final_3_0_5_1.CPTVehicleIden;
import tcip_final_3_0_5_1.CcLocationReport;

/**
 * Tests {@link RecordValidationServiceImpl}
 * @author abelsare
 *
 */
public class RecordValidationServiceImplTest {

	private RecordValidationServiceImpl validationService;
	
	@Mock
	private NycQueuedInferredLocationBean inferredResult;
	
	@Mock
	private RealtimeEnvelope envelope;
	
	@Mock 
	private CcLocationReport realTimeRecord;
	
	@Before
	public void setUp() throws Exception {
		MockitoAnnotations.initMocks(this);
		
		when(envelope.getCcLocationReport()).thenReturn(realTimeRecord);
		
		validationService = new RecordValidationServiceImpl();
	}

	@Test
	public void testInvalidInferredResult() {
		NycVehicleManagementStatusBean managementBean = mock(NycVehicleManagementStatusBean.class);
		
		when(inferredResult.getVehicleId()).thenReturn("MTA NYCT_4123");
		when(inferredResult.getServiceDate()).thenReturn(null);
		when(inferredResult.getRecordTimestamp()).thenReturn(1L);
		when(inferredResult.getManagementRecord()).thenReturn(managementBean);
		when(managementBean.getUUID()).thenReturn("123");
		when(inferredResult.getInferredLatitude()).thenReturn(1D);
		when(inferredResult.getInferredLongitude()).thenReturn(-1D);
		
		boolean valid = validationService.validateInferenceRecord(inferredResult);
		assertFalse("Expecting invalid inference record", valid);
		
		when(inferredResult.getVehicleId()).thenReturn("_4123");
		when(inferredResult.getServiceDate()).thenReturn(1L);
		when(inferredResult.getRecordTimestamp()).thenReturn(1L);
		when(inferredResult.getManagementRecord()).thenReturn(managementBean);
		when(managementBean.getUUID()).thenReturn("123");
		when(inferredResult.getInferredLatitude()).thenReturn(1D);
		when(inferredResult.getInferredLongitude()).thenReturn(-1D);
		
		valid = validationService.validateInferenceRecord(inferredResult);
		assertFalse("Expecting invalid inference record", valid);
		
		when(inferredResult.getVehicleId()).thenReturn("");
		when(inferredResult.getServiceDate()).thenReturn(null);
		when(inferredResult.getRecordTimestamp()).thenReturn(1L);
		when(inferredResult.getManagementRecord()).thenReturn(managementBean);
		when(managementBean.getUUID()).thenReturn("123");
		when(inferredResult.getInferredLatitude()).thenReturn(1D);
		when(inferredResult.getInferredLongitude()).thenReturn(-1D);
		
		valid = validationService.validateInferenceRecord(inferredResult);
		assertFalse("Expecting invalid inference record", valid);
		
		when(inferredResult.getVehicleId()).thenReturn("MTA NYCT_4123");
		when(inferredResult.getServiceDate()).thenReturn(1L);
		when(inferredResult.getRecordTimestamp()).thenReturn(1L);
		when(inferredResult.getManagementRecord()).thenReturn(managementBean);
		when(managementBean.getUUID()).thenReturn("");
		when(inferredResult.getInferredLatitude()).thenReturn(1D);
		when(inferredResult.getInferredLongitude()).thenReturn(-1D);
		
		valid = validationService.validateInferenceRecord(inferredResult);
		assertFalse("Expecting invalid inference record", valid);
		
		when(inferredResult.getVehicleId()).thenReturn("MTANYCT_4123");
		when(inferredResult.getServiceDate()).thenReturn(1L);
		when(inferredResult.getRecordTimestamp()).thenReturn(1L);
		when(inferredResult.getManagementRecord()).thenReturn(managementBean);
		when(managementBean.getUUID()).thenReturn("123");
		when(inferredResult.getInferredLatitude()).thenReturn(2000.000);
		when(inferredResult.getInferredLongitude()).thenReturn(-1D);
		
		valid = validationService.validateInferenceRecord(inferredResult);
		assertFalse("Expecting invalid inference record", valid);
		
		when(inferredResult.getVehicleId()).thenReturn("MTANYCT_4123");
		when(inferredResult.getServiceDate()).thenReturn(1L);
		when(inferredResult.getRecordTimestamp()).thenReturn(1L);
		when(inferredResult.getManagementRecord()).thenReturn(managementBean);
		when(managementBean.getUUID()).thenReturn("123");
		when(inferredResult.getInferredLatitude()).thenReturn(1D);
		when(inferredResult.getInferredLongitude()).thenReturn(-3000.000);
		
		valid = validationService.validateInferenceRecord(inferredResult);
		assertFalse("Expecting invalid inference record", valid);
	}
	
	@Test 
	public void testValidInferenceRecord() {
		NycVehicleManagementStatusBean managementBean = mock(NycVehicleManagementStatusBean.class);
		
		when(inferredResult.getVehicleId()).thenReturn("MTA NYCT_4123");
		when(inferredResult.getServiceDate()).thenReturn(1L);
		when(inferredResult.getRecordTimestamp()).thenReturn(1L);
		when(inferredResult.getManagementRecord()).thenReturn(managementBean);
		when(managementBean.getUUID()).thenReturn("123");
		when(inferredResult.getInferredLatitude()).thenReturn(1D);
		when(inferredResult.getInferredLongitude()).thenReturn(-1D);
		
		boolean valid = validationService.validateInferenceRecord(inferredResult);
		assertTrue("Expecting valid inference record", valid);
	}
	
	@Test
	public void testValueWithinRange() {
		double lowerBound = -999.999999;
		double upperBound = 999.999999;
		
		boolean inRange = validationService.isValueWithinRange(null, lowerBound, upperBound);
		assertFalse("Value not in given range", inRange);
		
		inRange = validationService.isValueWithinRange(-1001.2356, lowerBound, upperBound);
		assertFalse("Value not in given range", inRange);
		
		inRange = validationService.isValueWithinRange(2500.24521, lowerBound, upperBound);
		assertFalse("Value not in given range", inRange);
		
		inRange = validationService.isValueWithinRange(99.2452187, lowerBound, upperBound);
		assertTrue("Value is in given range", inRange);
		
		inRange = validationService.isValueWithinRange(43.895554, lowerBound, upperBound);
		assertTrue("Value is in given range", inRange);
	}
	
	@Test
	public void testInvalidRealTimeRecord() {
		CPTVehicleIden vehicle = mock(CPTVehicleIden.class);
		Angle directionAngle = mock(Angle.class);
		
		when(realTimeRecord.getVehicle()).thenReturn(vehicle);
		when(vehicle.getVehicleId()).thenReturn(1234L);
		when(vehicle.getAgencyId()).thenReturn(null);
		when(envelope.getUUID()).thenReturn("1234");
		when(realTimeRecord.getTimeReported()).thenReturn("2008-10-10T13:01:01");
		when(realTimeRecord.getLatitude()).thenReturn(43589641);
		when(realTimeRecord.getLongitude()).thenReturn(-74265987);
		when(realTimeRecord.getDirection()).thenReturn(directionAngle);
		when(directionAngle.getDeg()).thenReturn(new BigDecimal("45.98"));
		
		boolean isValid  = validationService.validateRealTimeRecord(envelope);
		assertFalse("Record should not be valid", isValid);
		
		when(realTimeRecord.getVehicle()).thenReturn(vehicle);
		when(vehicle.getVehicleId()).thenReturn(1234L);
		when(vehicle.getAgencyId()).thenReturn(2008L);
		when(envelope.getUUID()).thenReturn(" ");
		when(realTimeRecord.getTimeReported()).thenReturn("2008-10-10T13:01:01");
		when(realTimeRecord.getLatitude()).thenReturn(43589641);
		when(realTimeRecord.getLongitude()).thenReturn(-74265987);
		when(realTimeRecord.getDirection()).thenReturn(directionAngle);
		when(directionAngle.getDeg()).thenReturn(new BigDecimal("45.98"));
		
		isValid  = validationService.validateRealTimeRecord(envelope);
		assertFalse("Record should not be valid", isValid);
		
		when(realTimeRecord.getVehicle()).thenReturn(vehicle);
		when(vehicle.getVehicleId()).thenReturn(1234L);
		when(vehicle.getAgencyId()).thenReturn(2008L);
		when(envelope.getUUID()).thenReturn("1234");
		when(realTimeRecord.getTimeReported()).thenReturn("");
		when(realTimeRecord.getLatitude()).thenReturn(43589641);
		when(realTimeRecord.getLongitude()).thenReturn(-74265987);
		when(realTimeRecord.getDirection()).thenReturn(directionAngle);
		when(directionAngle.getDeg()).thenReturn(new BigDecimal("45.98"));
		
		isValid  = validationService.validateRealTimeRecord(envelope);
		assertFalse("Record should not be valid", isValid);
		
		when(realTimeRecord.getVehicle()).thenReturn(vehicle);
		when(vehicle.getVehicleId()).thenReturn(1234L);
		when(vehicle.getAgencyId()).thenReturn(2008L);
		when(envelope.getUUID()).thenReturn("1234");
		when(realTimeRecord.getTimeReported()).thenReturn("2008-10-10T13:01:01");
		when(realTimeRecord.getLatitude()).thenReturn(1000000000);
		when(realTimeRecord.getLongitude()).thenReturn(-74265987);
		when(realTimeRecord.getDirection()).thenReturn(directionAngle);
		when(directionAngle.getDeg()).thenReturn(new BigDecimal("45.98"));
		
		isValid  = validationService.validateRealTimeRecord(envelope);
		assertFalse("Record should not be valid", isValid);
		
		when(realTimeRecord.getVehicle()).thenReturn(vehicle);
		when(vehicle.getVehicleId()).thenReturn(1234L);
		when(vehicle.getAgencyId()).thenReturn(2008L);
		when(envelope.getUUID()).thenReturn("1234");
		when(realTimeRecord.getTimeReported()).thenReturn("2008-10-10T13:01:01");
		when(realTimeRecord.getLatitude()).thenReturn(43589641);
		when(realTimeRecord.getLongitude()).thenReturn(-2000000000);
		when(realTimeRecord.getDirection()).thenReturn(directionAngle);
		when(directionAngle.getDeg()).thenReturn(new BigDecimal("45.98"));
		
		isValid  = validationService.validateRealTimeRecord(envelope);
		assertFalse("Record should not be valid", isValid);
		
	}
	
	@Test
	public void testValidRealTimeRecord() {
		CPTVehicleIden vehicle = mock(CPTVehicleIden.class);
		Angle directionAngle = mock(Angle.class);
		
		when(realTimeRecord.getVehicle()).thenReturn(vehicle);
		when(vehicle.getVehicleId()).thenReturn(1234L);
		when(vehicle.getAgencyId()).thenReturn(2008L);
		
		when(envelope.getUUID()).thenReturn("1234");

		when(realTimeRecord.getTimeReported()).thenReturn("2008-10-10T13:01:01");
		when(realTimeRecord.getLatitude()).thenReturn(43589641);
		when(realTimeRecord.getLongitude()).thenReturn(-74265987);
		when(realTimeRecord.getDirection()).thenReturn(directionAngle);
		
		when(directionAngle.getDeg()).thenReturn(new BigDecimal("45.98"));
		
		boolean isValid  = validationService.validateRealTimeRecord(envelope);
		assertTrue("Record should be valid", isValid);
		
	}

}
