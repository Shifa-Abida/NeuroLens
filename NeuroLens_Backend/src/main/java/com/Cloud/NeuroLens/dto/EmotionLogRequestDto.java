package com.Cloud.NeuroLens.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmotionLogRequestDto {

    @NotBlank(message = "Person id is required")
    private String personId;

    @NotBlank(message = "Emotion is required")
    private String emotion;

    @NotNull(message = "Confidence is required")
    @DecimalMin(value = "0.0", message = "Confidence must be at least 0.0")
    @DecimalMax(value = "1.0", message = "Confidence must be at most 1.0")
    private Double confidence;
}
