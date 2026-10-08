package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.AlertRequestDto;
import com.Cloud.NeuroLens.dto.AlertResponseDto;
import com.Cloud.NeuroLens.exception.ResourceNotFoundException;
import com.Cloud.NeuroLens.model.AlertEvent;
import com.Cloud.NeuroLens.repository.AlertEventRepository;
import com.Cloud.NeuroLens.websocket.AlertWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AlertServiceImpl implements AlertService {

    private final AlertEventRepository alertEventRepository;
    private final AlertWebSocketHandler alertWebSocketHandler;

    @Override
    public AlertResponseDto createAlert(AlertRequestDto dto) {
        LocalDateTime now = LocalDateTime.now();
        AlertEvent alert = AlertEvent.builder()
                .clientId(dto.getClientId())
                .personId(dto.getPersonId())
                .personName(dto.getPersonName())
                .category(dto.getCategory())
                .severity(dto.getSeverity())
                .matchedPhrase(dto.getMatchedPhrase())
                .triggerText(dto.getTriggerText())
                .timestamp(now)
                .status("ACTIVE")
                .build();

        AlertResponseDto response = mapToDto(alertEventRepository.save(alert));
        alertWebSocketHandler.broadcastAlert(response);
        return response;
    }

    @Override
    public List<AlertResponseDto> getAlerts(String status) {
        List<AlertEvent> alerts = status != null && !status.isBlank()
                ? alertEventRepository.findByStatusOrderByTimestampDesc(status)
                : alertEventRepository.findAllByOrderByTimestampDesc();
        return alerts.stream().map(this::mapToDto).toList();
    }

    @Override
    public AlertResponseDto ignoreAlert(String alertId, String ignoredBy) {
        AlertEvent alert = alertEventRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + alertId));
        alert.setStatus("IGNORED");
        alert.setIgnoredBy(ignoredBy != null && !ignoredBy.isBlank() ? ignoredBy : "caregiver");
        alert.setIgnoredAt(LocalDateTime.now());
        AlertResponseDto response = mapToDto(alertEventRepository.save(alert));
        alertWebSocketHandler.broadcastAlert(response);
        return response;
    }

    private AlertResponseDto mapToDto(AlertEvent alert) {
        return AlertResponseDto.builder()
                .alertId(alert.getAlertId())
                .clientId(alert.getClientId())
                .personId(alert.getPersonId())
                .personName(alert.getPersonName())
                .category(alert.getCategory())
                .severity(alert.getSeverity())
                .matchedPhrase(alert.getMatchedPhrase())
                .triggerText(alert.getTriggerText())
                .timestamp(alert.getTimestamp())
                .status(alert.getStatus())
                .ignoredBy(alert.getIgnoredBy())
                .ignoredAt(alert.getIgnoredAt())
                .build();
    }
}
