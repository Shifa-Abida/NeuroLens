package com.Cloud.NeuroLens.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SightingRequestDto {

    @NotBlank(message = "Person ID is required")
    private String personId;

    private String sceneSnapshot; // Base64 snapshot image

    private String location; // e.g. "Living Room"
}
