package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.ContextResponseDto;

public interface ContextService {

    ContextResponseDto getContext(String personId);
}