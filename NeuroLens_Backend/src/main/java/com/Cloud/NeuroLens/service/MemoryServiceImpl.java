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
import java.util.Optional;

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

        Person person = null;
        if (personId != null && !personId.isBlank() && !"undefined".equalsIgnoreCase(personId) && !"null".equalsIgnoreCase(personId)) {
            person = personRepository.findById(personId).orElse(null);
        }
        if (person == null && personName != null && !personName.isBlank()) {
            person = personRepository.findByName(personName.trim()).orElse(null);
        }
        if (person == null) {
            String pName = personName != null && !personName.isBlank() ? personName.trim() : "Recognized Contact";
            String rel = relationship != null && !relationship.isBlank() ? relationship.trim() : "Family Member";
            try {
                Person newPerson = Person.builder()
                        .clientId(clientId != null && !clientId.isBlank() ? clientId : "client_001")
                        .name(pName)
                        .relationship(rel)
                        .trusted(true)
                        .memoryIds(new ArrayList<>())
                        .conversationIds(new ArrayList<>())
                        .faceEmbeddings(new ArrayList<>())
                        .faceSnapshots(new ArrayList<>())
                        .firstSeen(LocalDateTime.now().toString())
                        .lastSeen(LocalDateTime.now().toString())
                        .timesSeen(1)
                        .createdAt(LocalDateTime.now().toString())
                        .updatedAt(LocalDateTime.now().toString())
                        .build();
                person = personRepository.save(newPerson);
            } catch (Exception ex) {
                throw new IllegalStateException("Could not create a person record for the uploaded memory.", ex);
            }
        }

        if (person == null || person.getId() == null || person.getId().isBlank()) {
            throw new IllegalArgumentException("A valid person record is required to persist this memory.");
        }

        // 1. Physically persist the actual video file in configured media storage
        String videoUrl = mediaStorageService.storeVideo(video);

        // 2. Create and persist PostgreSQL memory record
        LocalDateTime now = LocalDateTime.now();
        String pName = personName != null && !personName.isBlank() ? personName : person.getName();
        String rel = relationship != null && !relationship.isBlank() ? relationship : person.getRelationship();
        String memoryTitle = title != null && !title.isBlank() ? title : "First interaction with " + pName;
        String memoryDesc = description != null && !description.isBlank() ? description : "Real interaction recorded on " + now;
        Memory memory = Memory.builder()
                .clientId(person.getClientId() != null && !person.getClientId().isBlank()
                        ? person.getClientId()
                        : (clientId != null && !clientId.isBlank() ? clientId : "client_001"))
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

        // 3. Update person memory references (safely, never fail the upload)
        try {
            if (person != null && person.getId() != null) {
                personRepository.findById(person.getId()).ifPresent(freshPerson -> {
                    if (freshPerson.getMemoryIds() == null) {
                        freshPerson.setMemoryIds(new ArrayList<>());
                    }
                    if (!freshPerson.getMemoryIds().contains(saved.getId())) {
                        freshPerson.getMemoryIds().add(saved.getId());
                    }
                    freshPerson.setLastSeen(now.toString());
                    personRepository.save(freshPerson);
                });
            }
        } catch (Exception ex) {
            System.err.println("[NEUROLENS] Notice: updating person memoryIds: " + ex.getMessage());
        }

        return mapToDto(saved);
    }

    @Override
    public List<MemoryResponseDto> getMemoriesByPersonId(String personId) {
        List<MemoryResponseDto> list = memoryRepository.findByPersonIdOrderByTimestampDesc(personId)
                .stream()
                .map(this::mapToDto)
                .toList();
        if (!list.isEmpty()) {
            return list;
        }

        // Fallback: Check if personId is a name or maps to a person with another id
        Optional<Person> personOpt = personRepository.findById(personId);
        if (personOpt.isEmpty()) {
            personOpt = personRepository.findByName(personId);
        }
        if (personOpt.isPresent()) {
            return memoryRepository.findByPersonIdOrderByTimestampDesc(personOpt.get().getId())
                    .stream()
                    .map(this::mapToDto)
                    .toList();
        }
        return list;
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
