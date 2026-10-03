package com.Cloud.NeuroLens.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PersonResponseDto {

    private String id;
    private String personId;
    private String clientId;
    private String name;
    private String relationship;
    private String photoUrl;
    private String profilePhotoUrl;
    private String faceId;
    private String notes;
    private List<List<Double>> faceEmbeddings;
    private List<String> faceSnapshots;
    private Boolean trusted;
    private String firstSeen;
    private String lastSeen;
    private Integer timesSeen;
    private String createdAt;
    private String updatedAt;
}
