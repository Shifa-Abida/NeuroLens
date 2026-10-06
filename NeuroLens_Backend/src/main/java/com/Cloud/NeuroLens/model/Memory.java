package com.Cloud.NeuroLens.model;

import lombok.*;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Column;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "memories")
public class Memory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String clientId;

    private String personId;

    private String personName;
    private String relationship;

    private String title;
    @Column(columnDefinition = "text")
    private String description;
    private String emotion;

    private String videoUrl;
    private Integer duration;

    private String type; // e.g. "VIDEO", "INTERACTION_VIDEO"
    private String status; // e.g. "SAVED"

    private LocalDateTime timestamp;

    private String createdAt;
}
