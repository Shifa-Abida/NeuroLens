package com.Cloud.NeuroLens.model;

import lombok.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "persons")
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private String clientId;
    private String name;
    private String relationship; // e.g. Daughter, Friend, etc.
    private String photoUrl;     // URL or path of the reference photo
    private String faceId;       // face recognition system identifier
    @Column(columnDefinition = "text")
    private String notes;        // e.g. Lives in Bangalore. Loves gardening.
    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> memoryIds; // References memories.
    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> conversationIds; // stores conversation history.
    @JdbcTypeCode(SqlTypes.JSON)
    private List<List<Double>> faceEmbeddings; // stored face embeddings (descriptors)
    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> faceSnapshots; // base64 face snapshots
    private Boolean trusted;
    private String firstSeen; // ISO 8601 timestamp
    private String lastSeen;  // ISO 8601 timestamp
    private Integer timesSeen; // counter for encounters
    private String createdAt;
    private String updatedAt;
}
