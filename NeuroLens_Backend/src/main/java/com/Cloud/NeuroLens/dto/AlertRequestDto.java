package com.Cloud.NeuroLens.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlertRequestDto {

    @NotBlank(message = "Client id is required")
    private String clientId;

    @NotBlank(message = "Person id is required")
    private String personId;

    @NotBlank(message = "Person name is required")
    private String personName;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Severity is required")
    private String severity;

    @NotBlank(message = "Matched phrase is required")
    private String matchedPhrase;

    @NotBlank(message = "Trigger text is required")
    private String triggerText;
}
