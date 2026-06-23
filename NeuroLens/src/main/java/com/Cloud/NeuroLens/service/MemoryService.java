package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.MemoryRequestDto;
import com.Cloud.NeuroLens.dto.MemoryResponseDto;

import java.util.List;

public interface MemoryService {

    MemoryResponseDto createMemory(
            MemoryRequestDto requestDto);

    List<MemoryResponseDto> getMemoriesByPersonId(
            String personId);
}
