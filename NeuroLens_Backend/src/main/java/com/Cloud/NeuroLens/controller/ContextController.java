package com.Cloud.NeuroLens.controller;

import com.Cloud.NeuroLens.dto.ContextResponseDto;
import com.Cloud.NeuroLens.service.ContextService;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/context")
@RequiredArgsConstructor
public class ContextController {

    private final ContextService contextService;

    @GetMapping("/{personId}")
    public ContextResponseDto getContext(
            @PathVariable String personId) {

        return contextService.getContext(personId);
    }
}