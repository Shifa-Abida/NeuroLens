package com.Cloud.NeuroLens.service;

import com.Cloud.NeuroLens.dto.CreatePersonRequest;
import com.Cloud.NeuroLens.dto.CreateUnknownVisitorRequest;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PersonServiceImpl implements PersonService {

    private final PersonRepository personRepository;

    private final MediaStorageService mediaStorageService;

    public static final double REGISTERED_MATCH_THRESHOLD = 0.52;
    public static final double UNKNOWN_MATCH_THRESHOLD = 0.54;
    public static final int RETENTION_DAYS = 4;

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
                    .matchType("UNKNOWN")
                    .confidence(0.0)
                    .rawDistance(Double.MAX_VALUE)
                    .build();
        }

        List<Person> allPersons = personRepository.findAll();

        // ── STEP 1: COMPARE AGAINST ALL REGISTERED (TRUSTED) PEOPLE ──
        Person bestRegisteredMatch = null;
        double minRegisteredDistance = Double.MAX_VALUE;

        for (Person person : allPersons) {
            // Registered persons: trusted is true or null
            if (person.getTrusted() != null && !person.getTrusted()) {
                continue; // Skip temporary unknown visitors in Step 1
            }
            if (person.getFaceEmbeddings() == null || person.getFaceEmbeddings().isEmpty()) {
                continue;
            }
            for (List<Double> storedEmbedding : person.getFaceEmbeddings()) {
                if (storedEmbedding == null || storedEmbedding.size() != embedding.size()) {
                    continue;
                }
                double distance = calculateEuclideanDistance(embedding, storedEmbedding);
                if (distance < minRegisteredDistance) {
                    minRegisteredDistance = distance;
                    bestRegisteredMatch = person;
                }
            }
        }

        // ACCEPTANCE TEST FOR REGISTERED IDENTITY
        if (bestRegisteredMatch != null && minRegisteredDistance <= REGISTERED_MATCH_THRESHOLD) {
            bestRegisteredMatch.setTimesSeen((bestRegisteredMatch.getTimesSeen() == null ? 0 : bestRegisteredMatch.getTimesSeen()) + 1);
            bestRegisteredMatch.setLastSeen(LocalDateTime.now().toString());
            bestRegisteredMatch.setUpdatedAt(LocalDateTime.now().toString());
            personRepository.save(bestRegisteredMatch);

            double confidence = Math.max(0.0, Math.min(100.0, (1.0 - (minRegisteredDistance / 1.0)) * 100.0));

            return PersonRecognizeResponseDto.builder()
                    .matched(true)
                    .matchType("REGISTERED")
                    .confidence(Math.round(confidence * 10.0) / 10.0)
                    .rawDistance(minRegisteredDistance)
                    .person(mapToDto(bestRegisteredMatch))
                    .build();
        }

        // ── STEP 2: COMPARE AGAINST ACTIVE TEMPORARY UNKNOWN VISITORS (WITHIN 4-DAY RETENTION) ──
        Person bestUnknownMatch = null;
        double minUnknownDistance = Double.MAX_VALUE;
        LocalDateTime cutoff = LocalDateTime.now().minusDays(RETENTION_DAYS);

        for (Person person : allPersons) {
            // Temporary unknown visitors only
            if (person.getTrusted() == null || person.getTrusted()) {
                continue;
            }

            // Check expiration
            if (isExpired(person, cutoff)) {
                continue;
            }

            if (person.getFaceEmbeddings() == null || person.getFaceEmbeddings().isEmpty()) {
                continue;
            }
            for (List<Double> storedEmbedding : person.getFaceEmbeddings()) {
                if (storedEmbedding == null || storedEmbedding.size() != embedding.size()) {
                    continue;
                }
                double distance = calculateEuclideanDistance(embedding, storedEmbedding);
                if (distance < minUnknownDistance) {
                    minUnknownDistance = distance;
                    bestUnknownMatch = person;
                }
            }
        }

        // ACCEPTANCE TEST FOR RETURNING UNKNOWN VISITOR
        if (bestUnknownMatch != null && minUnknownDistance <= UNKNOWN_MATCH_THRESHOLD) {
            bestUnknownMatch.setTimesSeen((bestUnknownMatch.getTimesSeen() == null ? 0 : bestUnknownMatch.getTimesSeen()) + 1);
            bestUnknownMatch.setLastSeen(LocalDateTime.now().toString());
            bestUnknownMatch.setUpdatedAt(LocalDateTime.now().toString());
            personRepository.save(bestUnknownMatch);

            double confidence = Math.max(0.0, Math.min(100.0, (1.0 - (minUnknownDistance / 1.0)) * 100.0));

            return PersonRecognizeResponseDto.builder()
                    .matched(true)
                    .matchType("EXISTING_UNKNOWN")
                    .confidence(Math.round(confidence * 10.0) / 10.0)
                    .rawDistance(minUnknownDistance)
                    .person(mapToDto(bestUnknownMatch))
                    .build();
        }

        // ── STEP 3: NO MATCH (BRAND NEW UNKNOWN PERSON) ──
        return PersonRecognizeResponseDto.builder()
                .matched(false)
                .matchType("UNKNOWN")
                .confidence(10.0)
                .rawDistance(minRegisteredDistance == Double.MAX_VALUE ? 1.0 : minRegisteredDistance)
                .build();
    }

    @Override
    public PersonResponseDto createUnknownVisitor(CreateUnknownVisitorRequest request) {
        String now = LocalDateTime.now().toString();

        String photoUrl = request.getPhotoUrl();
        if ((photoUrl == null || photoUrl.isBlank()) && request.getPhoto() != null && !request.getPhoto().isBlank()) {
            try {
                photoUrl = mediaStorageService.storeBase64Photo(request.getPhoto());
            } catch (Exception e) {
                photoUrl = request.getPhoto(); // fallback to inline data url
            }
        }

        // Count existing temporary visitors to assign sequential numbering
        List<Person> temporaryPersons = personRepository.findByTrustedFalse();
        int visitorNumber = temporaryPersons != null ? temporaryPersons.size() + 1 : 1;
        String visitorName = "Unknown Visitor " + String.format("%03d", visitorNumber);

        List<List<Double>> embeddings = new ArrayList<>();
        if (request.getFaceEmbedding() != null && !request.getFaceEmbedding().isEmpty()) {
            embeddings.add(request.getFaceEmbedding());
        }

        List<String> snapshots = new ArrayList<>();
        if (photoUrl != null && !photoUrl.isBlank()) {
            snapshots.add(photoUrl);
        }

        Person visitor = Person.builder()
                .clientId(request.getClientId() != null ? request.getClientId() : "client_001")
                .name(visitorName)
                .relationship("Visitor")
                .photoUrl(photoUrl != null ? photoUrl : "")
                .faceId("UNKNOWN_VISITOR_" + UUID.randomUUID().toString().substring(0, 8))
                .notes(request.getNotes() != null && !request.getNotes().isBlank()
                        ? request.getNotes()
                        : "Unregistered visitor detected by NeuroLens vision system.")
                .memoryIds(new ArrayList<>())
                .conversationIds(new ArrayList<>())
                .faceEmbeddings(embeddings)
                .faceSnapshots(snapshots)
                .trusted(false)
                .firstSeen(now)
                .lastSeen(now)
                .timesSeen(1)
                .createdAt(now)
                .updatedAt(now)
                .build();

        Person saved = personRepository.save(visitor);
        return mapToDto(saved);
    }

    @Override
    public List<PersonResponseDto> getTemporaryVisitors() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(RETENTION_DAYS);
        return personRepository.findAll()
                .stream()
                .filter(p -> Boolean.FALSE.equals(p.getTrusted()))
                .filter(p -> !isExpired(p, cutoff))
                .map(this::mapToDto)
                .toList();
    }

    @Override
    public PersonResponseDto promoteTemporaryVisitor(String id, CreatePersonRequest request) {
        Person person = personRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Temporary visitor not found with id: " + id));

        person.setTrusted(true);
        if (request.getName() != null && !request.getName().isBlank()) {
            person.setName(request.getName());
        }
        if (request.getRelationship() != null && !request.getRelationship().isBlank()) {
            person.setRelationship(request.getRelationship());
        }
        if (request.getNotes() != null) {
            person.setNotes(request.getNotes());
        }
        person.setUpdatedAt(LocalDateTime.now().toString());

        Person promoted = personRepository.save(person);
        return mapToDto(promoted);
    }

    @Override
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 3600000) // hourly cleanup
    public int purgeExpiredTemporaryVisitors() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(RETENTION_DAYS);
        List<Person> allPersons = personRepository.findAll();
        int purgedCount = 0;

        for (Person person : allPersons) {
            // NEVER PURGE REGISTERED (TRUSTED) PEOPLE
            if (person.getTrusted() == null || person.getTrusted()) {
                continue;
            }

            if (isExpired(person, cutoff)) {
                if (person.getPhotoUrl() != null) {
                    mediaStorageService.deleteMedia(person.getPhotoUrl());
                }
                personRepository.delete(person);
                purgedCount++;
            }
        }

        return purgedCount;
    }

    private boolean isExpired(Person person, LocalDateTime cutoff) {
        try {
            String timestamp = person.getLastSeen() != null ? person.getLastSeen() : person.getCreatedAt();
            if (timestamp == null) return false;
            LocalDateTime dt = LocalDateTime.parse(timestamp.replace("Z", ""));
            return dt.isBefore(cutoff);
        } catch (Exception e) {
            return false;
        }
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
