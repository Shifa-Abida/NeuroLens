package com.Cloud.NeuroLens.repository;

import com.Cloud.NeuroLens.model.Sighting;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SightingRepository
        extends MongoRepository<Sighting, String> {

    List<Sighting> findByPersonIdOrderByTimestampDesc(String personId);
}
