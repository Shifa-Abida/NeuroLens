package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.AlertRequestDto;
import com.Cloud.NeuroLens.dto.AlertResponseDto;

import java.util.List;

public interface AlertService {

    AlertResponseDto createAlert(AlertRequestDto dto);

    List<AlertResponseDto> getAlerts(String status);

    AlertResponseDto ignoreAlert(String alertId, String ignoredBy);
}
