package com.Cloud.NeuroLens.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PersonResponseDto {

    private String id;
    private String name;
    private String relationship;
    private String photoUrl;
    private String faceId;
    private String notes;
    private java.util.List<java.util.List<Double>> faceEmbeddings;
    private java.util.List<String> faceSnapshots;
    private String firstSeen;
    private String lastSeen;
    private Integer timesSeen;
}
