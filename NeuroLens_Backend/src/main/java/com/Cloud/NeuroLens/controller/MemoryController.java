package com.Cloud.NeuroLens.controller;

import com.Cloud.NeuroLens.dto.MemoryRequestDto;
import com.Cloud.NeuroLens.dto.MemoryResponseDto;
import com.Cloud.NeuroLens.service.MemoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/memories", "/api/memory"})
@RequiredArgsConstructor
public class MemoryController {

    private final MemoryService memoryService;

    @PostMapping("/upload")
    public MemoryResponseDto uploadMemoryVideo(
            @RequestParam(value = "video", required = false) MultipartFile video,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "clientId", required = false, defaultValue = "client_001") String clientId,
            @RequestParam("personId") String personId,
            @RequestParam(value = "duration", required = false, defaultValue = "7") Integer duration,
            @RequestParam(value = "personName", required = false) String personName,
            @RequestParam(value = "relationship", required = false) String relationship,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description) throws IOException {

        MultipartFile targetFile = video != null ? video : file;
        return memoryService.saveUploadedMemory(
                targetFile,
                clientId,
                personId,
                duration,
                personName,
                relationship,
                title,
                description
        );
    }

    @PostMapping
    public MemoryResponseDto createMemory(
            @Valid @RequestBody MemoryRequestDto dto) {
        return memoryService.createMemory(dto);
    }

    @GetMapping
    public List<MemoryResponseDto> getAllMemories() {
        return memoryService.getAllMemories();
    }

    @GetMapping("/person/{personId}")
    public List<MemoryResponseDto> getMemoriesByPersonPath(
            @PathVariable String personId) {
        return memoryService.getMemoriesByPersonId(personId);
    }

    @GetMapping("/client/{clientId}")
    public List<MemoryResponseDto> getMemoriesByClientPath(
            @PathVariable String clientId) {
        return memoryService.getMemoriesByClientId(clientId);
    }

    @GetMapping("/{id}")
    public Object getMemoriesByIdOrPerson(
            @PathVariable String id) {
        // If query matches a person ID with memories, return the list; otherwise return the individual memory
        List<MemoryResponseDto> personMemories = memoryService.getMemoriesByPersonId(id);
        if (!personMemories.isEmpty()) {
            return personMemories;
        }
        try {
            return memoryService.getMemoryById(id);
        } catch (Exception e) {
            return personMemories; // return empty list
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteMemory(
            @PathVariable String id) {
        memoryService.deleteMemory(id);
        return ResponseEntity.ok(Collections.singletonMap("message", "Memory deleted successfully"));
    }
}
