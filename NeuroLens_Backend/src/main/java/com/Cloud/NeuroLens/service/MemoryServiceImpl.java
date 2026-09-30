package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.MemoryRequestDto;
import com.Cloud.NeuroLens.dto.MemoryResponseDto;
import com.Cloud.NeuroLens.exception.ResourceNotFoundException;
import com.Cloud.NeuroLens.model.Memory;
import com.Cloud.NeuroLens.model.Person;
import com.Cloud.NeuroLens.repository.MemoryRepository;
import com.Cloud.NeuroLens.repository.PersonRepository;
import com.Cloud.NeuroLens.service.MemoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MemoryServiceImpl
        implements MemoryService {

    private final PersonRepository personRepository;
    private final MemoryRepository memoryRepository;

    @Override
    public MemoryResponseDto createMemory(
            MemoryRequestDto dto) {

        // 1. CHECK IF PERSON EXISTS
        Person person = personRepository.findById(dto.getPersonId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Person not found with id: " + dto.getPersonId()
                        )
                );

        // 2. CREATE MEMORY ONLY IF PERSON EXISTS
        Memory memory = Memory.builder()
                .personId(dto.getPersonId())
                .title(dto.getTitle())
                .description(dto.getDescription())
                .emotion(dto.getEmotion())
                .timestamp(LocalDateTime.now())
                .build();

        Memory saved = memoryRepository.save(memory);

        return mapToDto(saved);
    }

    @Override
    public List<MemoryResponseDto>
    getMemoriesByPersonId(String personId) {

        return memoryRepository
                .findByPersonId(personId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    private MemoryResponseDto mapToDto(
            Memory memory) {

        return MemoryResponseDto.builder()
                .id(memory.getId())
                .personId(memory.getPersonId())
                .title(memory.getTitle())
                .description(memory.getDescription())
                .emotion(memory.getEmotion())
                .timestamp(memory.getTimestamp())
                .build();
    }
}