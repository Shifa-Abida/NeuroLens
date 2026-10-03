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
@Document(collection = "memories")
public class Memory {

    @Id
    private String id;

    @Indexed
    private String clientId;

    @Indexed
    private String personId;

    private String personName;
    private String relationship;

    private String title;
    private String description;
    private String emotion;

    private String videoUrl;
    private Integer duration;

    private String type; // e.g. "VIDEO", "INTERACTION_VIDEO"
    private String status; // e.g. "SAVED"

    @Indexed
    private LocalDateTime timestamp;

    private String createdAt;
}
