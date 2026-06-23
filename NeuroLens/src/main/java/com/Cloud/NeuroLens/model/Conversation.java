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
@Document(collection = "conversations")
public class Conversation {

    @Id
    private String id;

    @Indexed
    private String personId;

    private String transcript;   // raw conversation text

    private String summary;      // AI-generated later

    @Indexed
    private LocalDateTime timestamp;
}
