package com.Cloud.NeuroLens.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PersonRecognizeResponseDto {
    private boolean matched;
    private String matchType; // "REGISTERED", "EXISTING_UNKNOWN", "UNKNOWN"
    private double confidence;
    private double rawDistance;
    private PersonResponseDto person;
}
