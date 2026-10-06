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
@Table(name = "conversations")
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String personId;

    @Column(columnDefinition = "text")
    private String transcript;   // raw conversation text

    @Column(columnDefinition = "text")
    private String summary;      // AI-generated later

    private LocalDateTime timestamp;
}
