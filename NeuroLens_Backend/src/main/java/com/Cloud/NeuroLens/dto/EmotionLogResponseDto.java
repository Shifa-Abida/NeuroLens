package com.Cloud.NeuroLens.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmotionLogResponseDto {

    private String id;
    private String personId;
    private String emotion;
    private Double confidence;
    private LocalDateTime timestamp;
}
