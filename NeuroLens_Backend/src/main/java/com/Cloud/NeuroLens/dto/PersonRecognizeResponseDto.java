package com.Cloud.NeuroLens.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PersonRecognizeResponseDto {
    private boolean matched;
    private double confidence;
    private PersonResponseDto person;
}
