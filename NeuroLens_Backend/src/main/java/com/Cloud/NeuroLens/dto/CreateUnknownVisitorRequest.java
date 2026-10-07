package com.Cloud.NeuroLens.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateUnknownVisitorRequest {
    private String clientId;
    private String photo; // Base64 snapshot or image data URL
    private String photoUrl; // direct photo URL if already uploaded
    private List<Double> faceEmbedding;
    private String notes;
}
