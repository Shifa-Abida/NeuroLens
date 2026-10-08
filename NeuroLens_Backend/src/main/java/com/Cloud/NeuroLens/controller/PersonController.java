package com.Cloud.NeuroLens.controller;

import com.Cloud.NeuroLens.dto.CreatePersonRequest;
import com.Cloud.NeuroLens.dto.PersonRecognizeRequestDto;
import com.Cloud.NeuroLens.dto.PersonRecognizeResponseDto;
import com.Cloud.NeuroLens.dto.PersonResponseDto;
import com.Cloud.NeuroLens.service.MediaStorageService;
import com.Cloud.NeuroLens.service.PersonService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/persons", "/api/people"})
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3002"})
@RequiredArgsConstructor
public class PersonController {

    private final PersonService personService;
    private final MediaStorageService mediaStorageService;

    @PostMapping
    public PersonResponseDto createPerson(
            @Valid @RequestBody CreatePersonRequest request) {
        return personService.createPerson(request);
    }

    @PostMapping("/upload-photo")
    public ResponseEntity<Map<String, String>> uploadPhoto(
            @RequestParam("photo") MultipartFile file) throws IOException {
        String photoUrl = mediaStorageService.storePhoto(file);
        return ResponseEntity.ok(Collections.singletonMap("photoUrl", photoUrl));
    }

    @GetMapping
    public List<PersonResponseDto> getAllPersons() {
        return personService.getAllPersons();
    }

    @GetMapping("/{id}")
    public PersonResponseDto getPerson(@PathVariable String id) {
        return personService.getPersonById(id);
    }

    @PutMapping("/{id}")
    public PersonResponseDto updatePerson(
            @PathVariable String id,
            @Valid @RequestBody CreatePersonRequest request) {
        return personService.updatePerson(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deletePerson(@PathVariable String id) {
        personService.deletePerson(id);
        return ResponseEntity.ok(Collections.singletonMap("message", "Deleted Successfully"));
    }

    @PostMapping("/recognize")
    public PersonRecognizeResponseDto recognizePerson(
            @RequestBody PersonRecognizeRequestDto request) {
        return personService.recognizePerson(request.getEmbedding());
    }

    @PostMapping("/unknown-visitor")
    public PersonResponseDto createUnknownVisitor(
            @RequestBody com.Cloud.NeuroLens.dto.CreateUnknownVisitorRequest request) {
        return personService.createUnknownVisitor(request);
    }

    @GetMapping({"/temporary", "/unknown-visitors"})
    public List<PersonResponseDto> getTemporaryVisitors() {
        return personService.getTemporaryVisitors();
    }

    @PutMapping("/{id}/promote")
    public PersonResponseDto promoteTemporaryVisitor(
            @PathVariable String id,
            @RequestBody CreatePersonRequest request) {
        return personService.promoteTemporaryVisitor(id, request);
    }

    @DeleteMapping("/expired-visitors")
    public ResponseEntity<Map<String, Object>> purgeExpiredVisitors() {
        int purged = personService.purgeExpiredTemporaryVisitors();
        return ResponseEntity.ok(Map.of("message", "Purged expired temporary visitors", "purgedCount", purged));
    }
}

