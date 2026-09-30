package com.Cloud.NeuroLens.controller;

import com.Cloud.NeuroLens.dto.*;
import com.Cloud.NeuroLens.service.ConversationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/conversation")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    @PostMapping
    public ConversationResponseDto saveConversation(
            @Valid @RequestBody ConversationRequestDto dto) {

        return conversationService.saveConversation(dto);
    }

    @GetMapping("/{personId}")
    public List<ConversationResponseDto> getByPersonId(
            @PathVariable String personId) {

        return conversationService.getConversationsByPersonId(personId);
    }
}
