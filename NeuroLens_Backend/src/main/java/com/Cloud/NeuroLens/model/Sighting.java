package com.Cloud.NeuroLens.model;

import lombok.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "sightings")
public class Sighting {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String personId;

    @Column(columnDefinition = "text")
    private String sceneSnapshot; // Base64 snapshot image of the scene

    private LocalDateTime timestamp;

    private String location; // optional location, e.g. "Living Room"
}
