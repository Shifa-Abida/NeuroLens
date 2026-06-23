package com.Cloud.NeuroLens.controller;

import com.Cloud.NeuroLens.dto.CreatePersonRequest;
import com.Cloud.NeuroLens.dto.PersonResponseDto;
import com.Cloud.NeuroLens.model.Person;
import com.Cloud.NeuroLens.service.PersonService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/persons")
@RequiredArgsConstructor
public class PersonController {

    private final PersonService personService;

    @PostMapping
    public PersonResponseDto createPerson(
            @Valid
            @RequestBody
            CreatePersonRequest request) {

        return personService.createPerson(request);
    }

    @GetMapping
    public List<PersonResponseDto> getAllPersons() {
        return personService.getAllPersons();
    }

    @GetMapping("/{id}")
    public PersonResponseDto getPerson(
            @PathVariable String id) {

        return personService.getPersonById(id);
    }

    @PutMapping("/{id}")
    public PersonResponseDto updatePerson(
            @PathVariable String id,
            @Valid
            @RequestBody CreatePersonRequest request) {

        return personService.updatePerson(id, request);
    }

    @DeleteMapping("/{id}")
    public String deletePerson(
            @PathVariable String id) {

        personService.deletePerson(id);

        return "Deleted Successfully";
    }

    @PostMapping("/recognize")
    public com.Cloud.NeuroLens.dto.PersonRecognizeResponseDto recognizePerson(
            @RequestBody com.Cloud.NeuroLens.dto.PersonRecognizeRequestDto request) {
        return personService.recognizePerson(request.getEmbedding());
    }
}
