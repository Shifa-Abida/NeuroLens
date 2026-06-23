package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.EmotionLogRequestDto;
import com.Cloud.NeuroLens.dto.EmotionLogResponseDto;
import com.Cloud.NeuroLens.exception.ResourceNotFoundException;
import com.Cloud.NeuroLens.model.EmotionLog;
import com.Cloud.NeuroLens.repository.EmotionLogRepository;
import com.Cloud.NeuroLens.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmotionLogServiceImpl
        implements EmotionLogService {

    private final EmotionLogRepository emotionLogRepository;
    private final PersonRepository personRepository;

    @Override
    public EmotionLogResponseDto createEmotionLog(
            EmotionLogRequestDto dto) {

        personRepository.findById(dto.getPersonId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Person not found with id: " + dto.getPersonId()));

        EmotionLog emotionLog = EmotionLog.builder()
                .personId(dto.getPersonId())
                .emotion(dto.getEmotion())
                .confidence(dto.getConfidence())
                .timestamp(LocalDateTime.now())
                .build();

        EmotionLog saved = emotionLogRepository.save(emotionLog);
        return mapToDto(saved);
    }

    @Override
    public List<EmotionLogResponseDto> getEmotionLogsByPersonId(
            String personId) {

        return emotionLogRepository
                .findByPersonIdOrderByTimestampDesc(personId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    private EmotionLogResponseDto mapToDto(
            EmotionLog emotionLog) {

        return EmotionLogResponseDto.builder()
                .id(emotionLog.getId())
                .personId(emotionLog.getPersonId())
                .emotion(emotionLog.getEmotion())
                .confidence(emotionLog.getConfidence())
                .timestamp(emotionLog.getTimestamp())
                .build();
    }
}
