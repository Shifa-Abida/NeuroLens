package com.Cloud.NeuroLens.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationRequestDto {

    @NotBlank(message = "Person id is required")
    private String personId;

    @NotBlank(message = "Transcript is required")
    private String transcript;
}
