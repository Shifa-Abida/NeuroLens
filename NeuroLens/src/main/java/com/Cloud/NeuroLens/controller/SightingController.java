package com.Cloud.NeuroLens.controller;

import com.Cloud.NeuroLens.dto.SightingRequestDto;
import com.Cloud.NeuroLens.model.Sighting;
import com.Cloud.NeuroLens.repository.SightingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/sightings")
@RequiredArgsConstructor
public class SightingController {

    private final SightingRepository sightingRepository;

    @PostMapping
    public Sighting logSighting(@RequestBody SightingRequestDto request) {
        Sighting sighting = Sighting.builder()
                .personId(request.getPersonId())
                .sceneSnapshot(request.getSceneSnapshot())
                .location(request.getLocation() != null ? request.getLocation() : "Unknown")
                .timestamp(LocalDateTime.now())
                .build();
        return sightingRepository.save(sighting);
    }

    @GetMapping("/person/{personId}")
    public List<Sighting> getSightingsByPerson(@PathVariable String personId) {
        return sightingRepository.findByPersonIdOrderByTimestampDesc(personId);
    }
}
