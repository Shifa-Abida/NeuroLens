package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.CreatePersonRequest;
import com.Cloud.NeuroLens.dto.PersonResponseDto;
import com.Cloud.NeuroLens.model.Person;

import java.util.List;

public interface PersonService {

    PersonResponseDto createPerson(CreatePersonRequest request);

    List<PersonResponseDto> getAllPersons();

    PersonResponseDto getPersonById(String id);

    PersonResponseDto updatePerson(String id, CreatePersonRequest request);

    void deletePerson(String id);

    com.Cloud.NeuroLens.dto.PersonRecognizeResponseDto recognizePerson(List<Double> embedding);
}
