package com.Cloud.NeuroLens.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemoryRequestDto {

    @NotBlank(message = "Person id is required")
    private String personId;

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    private String emotion;
}
