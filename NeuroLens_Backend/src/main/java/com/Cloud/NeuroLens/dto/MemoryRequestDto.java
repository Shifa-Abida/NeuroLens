package com.Cloud.NeuroLens.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemoryRequestDto {

    private String clientId;

    @NotBlank(message = "Person id is required")
    private String personId;

    private String personName;
    private String relationship;

    @NotBlank(message = "Title is required")
    private String title;

    private String description;
    private String emotion;
    private String videoUrl;
    private Integer duration;
    private String type;
    private String status;
}
