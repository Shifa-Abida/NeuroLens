package com.Cloud.NeuroLens.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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
@Entity
@Table(name = "alert_events")
public class AlertEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String alertId;

    private String clientId;
    private String personId;
    private String personName;
    private String category;
    private String severity;
    private String matchedPhrase;

    @Column(columnDefinition = "text")
    private String triggerText;

    private LocalDateTime timestamp;
    private String status;
    private String ignoredBy;
    private LocalDateTime ignoredAt;
}
