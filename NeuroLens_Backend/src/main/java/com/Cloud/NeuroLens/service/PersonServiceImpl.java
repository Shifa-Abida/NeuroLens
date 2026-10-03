package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.CreatePersonRequest;
import com.Cloud.NeuroLens.dto.PersonRecognizeResponseDto;
import com.Cloud.NeuroLens.dto.PersonResponseDto;
import com.Cloud.NeuroLens.exception.ResourceNotFoundException;
import com.Cloud.NeuroLens.model.Person;
import com.Cloud.NeuroLens.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PersonServiceImpl implements PersonService {

    private final PersonRepository personRepository;

    @Override
    public PersonResponseDto createPerson(CreatePersonRequest request) {
        String now = LocalDateTime.now().toString();
        String photo = request.getPhotoUrl() != null && !request.getPhotoUrl().isBlank()
                ? request.getPhotoUrl()
                : request.getProfilePhotoUrl();

        Person person = Person.builder()
                .clientId(request.getClientId() != null ? request.getClientId() : "client_001")
                .name(request.getName())
                .relationship(request.getRelationship())
                .photoUrl(photo)
                .faceId(request.getFaceId())
                .notes(request.getNotes())
                .memoryIds(new ArrayList<>())
                .conversationIds(new ArrayList<>())
                .faceEmbeddings(request.getFaceEmbeddings() != null ? request.getFaceEmbeddings() : new ArrayList<>())
                .faceSnapshots(request.getFaceSnapshots() != null ? request.getFaceSnapshots() : new ArrayList<>())
                .trusted(request.getTrusted() != null ? request.getTrusted() : true)
                .firstSeen(request.getFirstSeen() != null ? request.getFirstSeen() : now)
                .lastSeen(request.getLastSeen() != null ? request.getLastSeen() : now)
                .timesSeen(request.getTimesSeen() != null ? request.getTimesSeen() : 0)
                .createdAt(now)
                .updatedAt(now)
                .build();

        Person savedPerson = personRepository.save(person);
        return mapToDto(savedPerson);
    }

    public PersonResponseDto mapToDto(Person person) {
        return PersonResponseDto.builder()
                .id(person.getId())
                .personId(person.getId())
                .clientId(person.getClientId())
                .name(person.getName())
                .relationship(person.getRelationship())
                .photoUrl(person.getPhotoUrl())
                .profilePhotoUrl(person.getPhotoUrl())
                .faceId(person.getFaceId())
                .notes(person.getNotes())
                .faceEmbeddings(person.getFaceEmbeddings())
                .faceSnapshots(person.getFaceSnapshots())
                .trusted(person.getTrusted() != null ? person.getTrusted() : true)
                .firstSeen(person.getFirstSeen())
                .lastSeen(person.getLastSeen())
                .timesSeen(person.getTimesSeen())
                .createdAt(person.getCreatedAt())
                .updatedAt(person.getUpdatedAt())
                .build();
    }

    @Override
    public List<PersonResponseDto> getAllPersons() {
        return personRepository.findAll()
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    public PersonResponseDto getPersonById(String id) {
        Person person = personRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Person Not Found with id: " + id));

        return mapToDto(person);
    }

    @Override
    public PersonResponseDto updatePerson(String id, CreatePersonRequest request) {
        Person person = personRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Person Not Found with id: " + id));

        person.setName(request.getName());
        person.setRelationship(request.getRelationship());
        String photo = request.getPhotoUrl() != null && !request.getPhotoUrl().isBlank()
                ? request.getPhotoUrl()
                : request.getProfilePhotoUrl();
        if (photo != null) {
            person.setPhotoUrl(photo);
        }
        if (request.getFaceId() != null) {
            person.setFaceId(request.getFaceId());
        }
        if (request.getNotes() != null) {
            person.setNotes(request.getNotes());
        }
        if (request.getFaceEmbeddings() != null) {
            person.setFaceEmbeddings(request.getFaceEmbeddings());
        }
        if (request.getFaceSnapshots() != null) {
            person.setFaceSnapshots(request.getFaceSnapshots());
        }
        if (request.getTrusted() != null) {
            person.setTrusted(request.getTrusted());
        }
        if (request.getFirstSeen() != null) {
            person.setFirstSeen(request.getFirstSeen());
        }
        if (request.getLastSeen() != null) {
            person.setLastSeen(request.getLastSeen());
        }
        if (request.getTimesSeen() != null) {
            person.setTimesSeen(request.getTimesSeen());
        }
        person.setUpdatedAt(LocalDateTime.now().toString());

        Person updatedPerson = personRepository.save(person);
        return mapToDto(updatedPerson);
    }

    @Override
    public void deletePerson(String id) {
        personRepository.deleteById(id);
    }

    @Override
    public PersonRecognizeResponseDto recognizePerson(List<Double> embedding) {
        if (embedding == null || embedding.isEmpty()) {
            return PersonRecognizeResponseDto.builder()
                    .matched(false)
                    .confidence(0.0)
                    .build();
        }

        List<Person> allPersons = personRepository.findAll();
        Person bestMatch = null;
        double minDistance = Double.MAX_VALUE;

        for (Person person : allPersons) {
            if (person.getFaceEmbeddings() == null || person.getFaceEmbeddings().isEmpty()) {
                continue;
            }
            for (List<Double> storedEmbedding : person.getFaceEmbeddings()) {
                if (storedEmbedding == null || storedEmbedding.size() != embedding.size()) {
                    continue;
                }
                double distance = calculateEuclideanDistance(embedding, storedEmbedding);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = person;
                }
            }
        }

        double threshold = 0.6;
        if (bestMatch != null && minDistance <= threshold) {
            bestMatch.setTimesSeen((bestMatch.getTimesSeen() == null ? 0 : bestMatch.getTimesSeen()) + 1);
            bestMatch.setLastSeen(LocalDateTime.now().toString());
            bestMatch.setUpdatedAt(LocalDateTime.now().toString());
            personRepository.save(bestMatch);

            double confidence = Math.max(0.0, Math.min(100.0, (1.0 - (minDistance / 2.0)) * 100.0));

            return PersonRecognizeResponseDto.builder()
                    .matched(true)
                    .confidence(Math.round(confidence * 10.0) / 10.0)
                    .person(mapToDto(bestMatch))
                    .build();
        }

        double simulatedLowConfidence = Math.max(5.0, Math.min(25.0, (1.0 - (minDistance == Double.MAX_VALUE ? 1.0 : minDistance) / 2.0) * 100.0));
        return PersonRecognizeResponseDto.builder()
                .matched(false)
                .confidence(Math.round(simulatedLowConfidence * 10.0) / 10.0)
                .build();
    }

    private double calculateEuclideanDistance(List<Double> a, List<Double> b) {
        double sum = 0.0;
        for (int i = 0; i < a.size(); i++) {
            double diff = a.get(i) - b.get(i);
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }
}
