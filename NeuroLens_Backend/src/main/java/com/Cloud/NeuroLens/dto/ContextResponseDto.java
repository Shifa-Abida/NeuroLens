package com.Cloud.NeuroLens.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContextResponseDto {

    private PersonResponseDto person;

    private List<String> memories;

    private String lastConversation;

    private String emotionStatus;
}