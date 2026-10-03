package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.MemoryRequestDto;
import com.Cloud.NeuroLens.dto.MemoryResponseDto;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

public interface MemoryService {

    MemoryResponseDto createMemory(MemoryRequestDto requestDto);

    MemoryResponseDto saveUploadedMemory(
            MultipartFile video,
            String clientId,
            String personId,
            Integer duration,
            String personName,
            String relationship,
            String title,
            String description) throws IOException;

    List<MemoryResponseDto> getMemoriesByPersonId(String personId);

    List<MemoryResponseDto> getMemoriesByClientId(String clientId);

    List<MemoryResponseDto> getAllMemories();

    MemoryResponseDto getMemoryById(String id);

    void deleteMemory(String id);
}
