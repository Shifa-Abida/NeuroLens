package com.Cloud.NeuroLens.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreatePersonRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Relationship is required")
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
