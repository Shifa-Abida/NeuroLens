package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.ConversationRequestDto;
import com.Cloud.NeuroLens.dto.ConversationResponseDto;

import java.util.List;

public interface ConversationService {

    ConversationResponseDto saveConversation(ConversationRequestDto dto);

    List<ConversationResponseDto> getConversationsByPersonId(String personId);
}