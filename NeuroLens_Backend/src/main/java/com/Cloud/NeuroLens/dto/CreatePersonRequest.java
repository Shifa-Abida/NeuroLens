package com.Cloud.NeuroLens.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class CreatePersonRequest {

    private String clientId;

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Relationship is required")
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
}
