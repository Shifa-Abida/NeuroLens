package com.Cloud.NeuroLens.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlertResponseDto {

    private String alertId;
    private String clientId;
    private String personId;
    private String personName;
    private String category;
    private String severity;
    private String matchedPhrase;
    private String triggerText;
    private LocalDateTime timestamp;
    private String status;
    private String ignoredBy;
    private LocalDateTime ignoredAt;
}
