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
@Document(collection = "emotion_logs")
public class EmotionLog {

    @Id
    private String id;

    @Indexed
    private String personId;

    private String emotion;

    private Double confidence;

    @Indexed
    private LocalDateTime timestamp;
}
