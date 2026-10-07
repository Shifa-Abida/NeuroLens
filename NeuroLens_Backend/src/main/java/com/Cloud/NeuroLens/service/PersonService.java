package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.CreatePersonRequest;
import com.Cloud.NeuroLens.dto.CreateUnknownVisitorRequest;
import com.Cloud.NeuroLens.dto.PersonRecognizeResponseDto;
import com.Cloud.NeuroLens.dto.PersonResponseDto;

import java.util.List;

public interface PersonService {

    PersonResponseDto createPerson(CreatePersonRequest request);

    List<PersonResponseDto> getAllPersons();

    PersonResponseDto getPersonById(String id);

    PersonResponseDto updatePerson(String id, CreatePersonRequest request);

    void deletePerson(String id);

    PersonRecognizeResponseDto recognizePerson(List<Double> embedding);

    PersonResponseDto createUnknownVisitor(CreateUnknownVisitorRequest request);

    List<PersonResponseDto> getTemporaryVisitors();

    PersonResponseDto promoteTemporaryVisitor(String id, CreatePersonRequest request);

    int purgeExpiredTemporaryVisitors();
}
