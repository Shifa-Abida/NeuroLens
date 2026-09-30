package com.Cloud.NeuroLens.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationResponseDto {

    private String id;
    private String personId;
    private String transcript;
    private String summary;
    private LocalDateTime timestamp;
}