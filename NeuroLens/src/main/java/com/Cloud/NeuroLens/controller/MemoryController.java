package com.Cloud.NeuroLens.controller;

import com.Cloud.NeuroLens.dto.MemoryRequestDto;
import com.Cloud.NeuroLens.dto.MemoryResponseDto;
import com.Cloud.NeuroLens.service.MemoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/memory")
@RequiredArgsConstructor
public class MemoryController {

    private final MemoryService memoryService;

    @PostMapping
    public MemoryResponseDto createMemory(
            @Valid @RequestBody MemoryRequestDto dto) {

        return memoryService.createMemory(dto);
    }

    @GetMapping("/{personId}")
    public List<MemoryResponseDto>
    getMemoriesByPersonId(
            @PathVariable String personId) {

        return memoryService
                .getMemoriesByPersonId(personId);
    }
}
