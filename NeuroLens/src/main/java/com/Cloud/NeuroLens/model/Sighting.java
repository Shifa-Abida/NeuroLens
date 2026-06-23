package com.Cloud.NeuroLens.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "sightings")
public class Sighting {

    @Id
    private String id;

    @Indexed
    private String personId;

    private String sceneSnapshot; // Base64 snapshot image of the scene

    @Indexed
    private LocalDateTime timestamp;

    private String location; // optional location, e.g. "Living Room"
}
