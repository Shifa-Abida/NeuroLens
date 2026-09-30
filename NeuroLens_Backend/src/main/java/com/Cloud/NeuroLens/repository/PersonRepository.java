package com.Cloud.NeuroLens.repository;

import com.Cloud.NeuroLens.model.Person;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PersonRepository
        extends MongoRepository<Person, String> {

    Optional<Person> findByName(String name);
}
