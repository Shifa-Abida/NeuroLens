package com.Cloud.NeuroLens.controller;

import com.Cloud.NeuroLens.dto.EmotionLogRequestDto;
import com.Cloud.NeuroLens.dto.EmotionLogResponseDto;
import com.Cloud.NeuroLens.service.EmotionLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/emotion-log")
@RequiredArgsConstructor
public class EmotionLogController {

    private final EmotionLogService emotionLogService;

    @PostMapping
    public EmotionLogResponseDto createEmotionLog(
            @Valid @RequestBody EmotionLogRequestDto dto) {

        return emotionLogService.createEmotionLog(dto);
    }

    @GetMapping("/{personId}")
    public List<EmotionLogResponseDto> getEmotionLogsByPersonId(
            @PathVariable String personId) {

        return emotionLogService.getEmotionLogsByPersonId(personId);
    }
}
