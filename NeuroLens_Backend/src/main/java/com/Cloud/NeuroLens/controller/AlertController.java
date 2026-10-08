package com.Cloud.NeuroLens.controller;

import com.Cloud.NeuroLens.dto.AlertRequestDto;
import com.Cloud.NeuroLens.dto.AlertResponseDto;
import com.Cloud.NeuroLens.service.AlertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3002"})
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @PostMapping
    public AlertResponseDto createAlert(@Valid @RequestBody AlertRequestDto dto) {
        return alertService.createAlert(dto);
    }

    @GetMapping
    public List<AlertResponseDto> getAlerts(@RequestParam(value = "status", required = false) String status) {
        return alertService.getAlerts(status);
    }

    @PutMapping("/{alertId}/ignore")
    public AlertResponseDto ignoreAlert(
            @PathVariable String alertId,
            @RequestBody(required = false) Map<String, String> body) {
        String ignoredBy = body != null ? body.get("ignoredBy") : null;
        return alertService.ignoreAlert(alertId, ignoredBy);
    }
}
