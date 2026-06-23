package com.Cloud.NeuroLens.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemoryResponseDto {

    private String id;
    private String personId;
    private String title;
    private String description;
    private String emotion;
    private LocalDateTime timestamp;
}