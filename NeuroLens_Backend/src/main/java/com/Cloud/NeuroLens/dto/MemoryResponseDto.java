package com.Cloud.NeuroLens.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemoryResponseDto {

    private String id;
    private String memoryId; // alias for id
    private String clientId;
    private String personId;
    private String personName;
    private String relationship;
    private String title;
    private String description;
    private String emotion;
    private String videoUrl;
    private Integer duration;
    private String type;
    private String status;
    private LocalDateTime timestamp;
    private String createdAt;
}