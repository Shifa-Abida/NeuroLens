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
    private String id;  //MongoDB ObjectId.
    private String name;
    private String relationship; // like daughter , son etc
    private String photoUrl;  // location of the photo
    private String faceId;  // face recognition system identifier
    private String notes;   //like Lives in Bangalore. Loves gardening.
    private List<String> memoryIds; // References memories.
    private List<String> conversationIds; // stores conversation history.
    private List<List<Double>> faceEmbeddings; // stored face embeddings (descriptors)
    private List<String> faceSnapshots; // base64 face snapshots
    private String firstSeen; // ISO 8601 timestamp
    private String lastSeen;  // ISO 8601 timestamp
    private Integer timesSeen; // counter for encounters
}
