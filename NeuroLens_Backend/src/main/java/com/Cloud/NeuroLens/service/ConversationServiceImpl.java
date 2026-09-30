package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.*;
import com.Cloud.NeuroLens.exception.ResourceNotFoundException;
import com.Cloud.NeuroLens.model.*;
import com.Cloud.NeuroLens.repository.*;
import com.Cloud.NeuroLens.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ConversationServiceImpl implements ConversationService {

    private final ConversationRepository conversationRepository;
    private final PersonRepository personRepository;

    @Override
    public ConversationResponseDto saveConversation(ConversationRequestDto dto) {

        // ✅ validate person exists
        personRepository.findById(dto.getPersonId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Person not found: " + dto.getPersonId()
                        )
                );

        Conversation conversation = Conversation.builder()
                .personId(dto.getPersonId())
                .transcript(dto.getTranscript())
                .summary(null) // future AI step
                .timestamp(LocalDateTime.now())
                .build();

        Conversation saved = conversationRepository.save(conversation);

        return mapToDto(saved);
    }

    @Override
    public List<ConversationResponseDto> getConversationsByPersonId(String personId) {

        return conversationRepository
                .findByPersonIdOrderByTimestampDesc(personId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    private ConversationResponseDto mapToDto(Conversation c) {
        return ConversationResponseDto.builder()
                .id(c.getId())
                .personId(c.getPersonId())
                .transcript(c.getTranscript())
                .summary(c.getSummary())
                .timestamp(c.getTimestamp())
                .build();
    }
}