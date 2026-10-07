package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.MemoryRequestDto;
import com.Cloud.NeuroLens.dto.MemoryResponseDto;
import com.Cloud.NeuroLens.exception.ResourceNotFoundException;
import com.Cloud.NeuroLens.model.Memory;
import com.Cloud.NeuroLens.model.Person;
import com.Cloud.NeuroLens.repository.MemoryRepository;
import com.Cloud.NeuroLens.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MemoryServiceImpl implements MemoryService {

    private final PersonRepository personRepository;
    private final MemoryRepository memoryRepository;
    private final MediaStorageService mediaStorageService;

    @Override
    public MemoryResponseDto createMemory(MemoryRequestDto dto) {
        Person person = personRepository.findById(dto.getPersonId())
                .orElseThrow(() -> new ResourceNotFoundException("Person not found with id: " + dto.getPersonId()));

        LocalDateTime now = LocalDateTime.now();

        Memory memory = Memory.builder()
                .clientId(dto.getClientId() != null ? dto.getClientId() : person.getClientId())
                .personId(person.getId())
                .personName(person.getName())
                .relationship(person.getRelationship())
                .title(dto.getTitle())
                .description(dto.getDescription())
                .emotion(dto.getEmotion() != null ? dto.getEmotion() : "Warm")
                .videoUrl(dto.getVideoUrl())
                .duration(dto.getDuration() != null ? dto.getDuration() : 15)
                .type(dto.getType() != null ? dto.getType() : "VIDEO")
                .status(dto.getStatus() != null ? dto.getStatus() : "SAVED")
                .timestamp(now)
                .createdAt(now.toString())
                .build();

        Memory saved = memoryRepository.save(memory);

        if (person.getMemoryIds() == null) {
            person.setMemoryIds(new ArrayList<>());
        }
        person.getMemoryIds().add(saved.getId());
        personRepository.save(person);

        return mapToDto(saved);
    }

    @Override
    public MemoryResponseDto saveUploadedMemory(
            MultipartFile video,
            String clientId,
            String personId,
            Integer duration,
            String personName,
            String relationship,
            String title,
            String description) throws IOException {

        if (video == null || video.isEmpty() || video.getSize() <= 0) {
            throw new IllegalArgumentException("RECORDING FAILED: EMPTY VIDEO BLOB");
        }

        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new ResourceNotFoundException("Person not found with id: " + personId));

        // 1. Physically persist the actual video file in configured media storage
        String videoUrl = mediaStorageService.storeVideo(video);

        // 2. Create and persist PostgreSQL memory record
        LocalDateTime now = LocalDateTime.now();
        String pName = personName != null && !personName.isBlank() ? personName : person.getName();
        String rel = relationship != null && !relationship.isBlank() ? relationship : person.getRelationship();
        String memoryTitle = title != null && !title.isBlank() ? title : "First interaction with " + pName;
        String memoryDesc = description != null && !description.isBlank() ? description : "Real interaction recorded on " + now;

        Memory memory = Memory.builder()
                .clientId(clientId != null && !clientId.isBlank() ? clientId : (person.getClientId() != null ? person.getClientId() : "client_001"))
                .personId(person.getId())
                .personName(pName)
                .relationship(rel)
                .title(memoryTitle)
                .description(memoryDesc)
                .emotion("Warm")
                .videoUrl(videoUrl)
                .duration(duration != null ? duration : 15)
                .type("INTERACTION_VIDEO")
                .status("SAVED")
                .timestamp(now)
                .createdAt(now.toString())
                .build();

        Memory saved = memoryRepository.save(memory);

        // 3. Update person memory references
        if (person.getMemoryIds() == null) {
            person.setMemoryIds(new ArrayList<>());
        }
        if (!person.getMemoryIds().contains(saved.getId())) {
            person.getMemoryIds().add(saved.getId());
        }
        person.setLastSeen(now.toString());
        personRepository.save(person);

        return mapToDto(saved);
    }

    @Override
    public List<MemoryResponseDto> getMemoriesByPersonId(String personId) {
        return memoryRepository.findByPersonIdOrderByTimestampDesc(personId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    public List<MemoryResponseDto> getMemoriesByClientId(String clientId) {
        return memoryRepository.findByClientIdOrderByTimestampDesc(clientId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    public List<MemoryResponseDto> getAllMemories() {
        return memoryRepository.findAllByOrderByTimestampDesc()
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    public MemoryResponseDto getMemoryById(String id) {
        Memory memory = memoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Memory not found with id: " + id));
        return mapToDto(memory);
    }

    @Override
    public void deleteMemory(String id) {
        Memory memory = memoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Memory not found with id: " + id));

        // Delete physical video file from media storage
        if (memory.getVideoUrl() != null) {
            mediaStorageService.deleteMedia(memory.getVideoUrl());
        }

        // Delete memory record from PostgreSQL
        memoryRepository.delete(memory);

        // Remove memory reference from Person if present
        if (memory.getPersonId() != null) {
            personRepository.findById(memory.getPersonId()).ifPresent(person -> {
                if (person.getMemoryIds() != null && person.getMemoryIds().remove(id)) {
                    personRepository.save(person);
                }
            });
        }
    }

    private MemoryResponseDto mapToDto(Memory memory) {
        return MemoryResponseDto.builder()
                .id(memory.getId())
                .memoryId(memory.getId())
                .clientId(memory.getClientId())
                .personId(memory.getPersonId())
                .personName(memory.getPersonName())
                .relationship(memory.getRelationship())
                .title(memory.getTitle())
                .description(memory.getDescription())
                .emotion(memory.getEmotion())
                .videoUrl(memory.getVideoUrl())
                .duration(memory.getDuration())
                .type(memory.getType())
                .status(memory.getStatus())
                .timestamp(memory.getTimestamp())
                .createdAt(memory.getCreatedAt())
                .build();
    }
}