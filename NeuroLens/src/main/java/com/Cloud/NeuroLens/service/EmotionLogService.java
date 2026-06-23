package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.EmotionLogRequestDto;
import com.Cloud.NeuroLens.dto.EmotionLogResponseDto;

import java.util.List;

public interface EmotionLogService {

    EmotionLogResponseDto createEmotionLog(
            EmotionLogRequestDto dto);

    List<EmotionLogResponseDto> getEmotionLogsByPersonId(
            String personId);
}
