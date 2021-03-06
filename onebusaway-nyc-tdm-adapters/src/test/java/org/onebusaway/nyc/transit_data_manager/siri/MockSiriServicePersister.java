package org.onebusaway.nyc.transit_data_manager.siri;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import org.onebusaway.transit_data.model.service_alerts.ServiceAlertBean;

public class MockSiriServicePersister extends HashMap<String, ServiceAlertBean> implements
    SiriServicePersister {

  private static final long serialVersionUID = 1L;
  
  List<ServiceAlertSubscription> subs = new ArrayList<ServiceAlertSubscription>();
//  Map<String, ServiceAlertBean> alerts = new HashMap<String, ServiceAlertBean>();
  
  public boolean saveOrUpdateServiceAlert(ServiceAlertBean serviceAlertBean) {
    throw new RuntimeException("not implemented");
  }

  public ServiceAlertBean deleteServiceAlertById(String serviceAlertId) {
    throw new RuntimeException("not implemented");
  }

  public List<ServiceAlertBean> getAllActiveServiceAlerts() {
    return new ArrayList<ServiceAlertBean>(super.values());
  }

  public List<ServiceAlertBean> getAllServiceAlerts() {
    throw new RuntimeException("not implemented");
  }

  public void saveOrUpdateSubscription(ServiceAlertSubscription subscription) {
    subs.add(subscription);
  }

  public void deleteSubscription(ServiceAlertSubscription subscription) {
    subs.remove(subscription);
  }

  public List<ServiceAlertSubscription> getAllActiveSubscriptions() {
    return subs;
  }

}