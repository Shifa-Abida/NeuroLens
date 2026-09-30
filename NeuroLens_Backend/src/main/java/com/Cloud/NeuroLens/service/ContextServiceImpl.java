package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.*;
import com.Cloud.NeuroLens.exception.ResourceNotFoundException;
import com.Cloud.NeuroLens.model.*;
import com.Cloud.NeuroLens.repository.*;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ContextServiceImpl
                implements ContextService {

        private final PersonRepository personRepository;
        private final MemoryRepository memoryRepository;
        private final ConversationRepository conversationRepository;
        private final EmotionLogRepository emotionLogRepository;

        @Override
        public ContextResponseDto getContext(String personId) {

                Person person = personRepository
                                .findById(personId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Person not found with id: " + personId));

                List<Memory> memories = memoryRepository
                                .findByPersonIdOrderByTimestampDesc(personId);

                List<Conversation> conversations = conversationRepository
                                .findByPersonIdOrderByTimestampDesc(personId);

                List<EmotionLog> emotionLogs = emotionLogRepository
                                .findByPersonIdOrderByTimestampDesc(personId);

                List<String> memoryTitles = memories.stream()
                                .map(Memory::getTitle)
                                .toList();

                String lastConversation = conversations.isEmpty()
                                ? "No conversations available."
                                : conversations.get(0)
                                                .getTranscript();

                String emotionStatus = !emotionLogs.isEmpty()
                                ? emotionLogs.get(0).getEmotion()
                                : memories.isEmpty()
                                                ? "Unknown"
                                                : memories.get(0).getEmotion();

                PersonResponseDto personDto = PersonResponseDto.builder()
                                .id(person.getId())
                                .name(person.getName())
                                .relationship(person.getRelationship())
                                .photoUrl(person.getPhotoUrl())
                                .faceId(person.getFaceId())
                                .notes(person.getNotes())
                                .build();

                return ContextResponseDto.builder()
                                .person(personDto)
                                .memories(memoryTitles)
                                .lastConversation(lastConversation)
                                .emotionStatus(emotionStatus)
                                .build();
        }
}
