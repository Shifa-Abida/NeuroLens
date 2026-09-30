package com.Cloud.NeuroLens.repository;

import com.Cloud.NeuroLens.model.Memory;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MemoryRepository
        extends MongoRepository<Memory, String> {

    List<Memory> findByPersonId(String personId);


    List<Memory> findByPersonIdOrderByTimestampDesc(
            String personId);
}