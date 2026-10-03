package com.Cloud.NeuroLens.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "persons")
public class Person {

    @Id
    private String id;  // MongoDB ObjectId
    private String clientId;
    private String name;
    private String relationship; // e.g. Daughter, Friend, etc.
    private String photoUrl;     // URL or path of the reference photo
    private String faceId;       // face recognition system identifier
    private String notes;        // e.g. Lives in Bangalore. Loves gardening.
    private List<String> memoryIds; // References memories.
    private List<String> conversationIds; // stores conversation history.
    private List<List<Double>> faceEmbeddings; // stored face embeddings (descriptors)
    private List<String> faceSnapshots; // base64 face snapshots
    private Boolean trusted;
    private String firstSeen; // ISO 8601 timestamp
    private String lastSeen;  // ISO 8601 timestamp
    private Integer timesSeen; // counter for encounters
    private String createdAt;
    private String updatedAt;
}
