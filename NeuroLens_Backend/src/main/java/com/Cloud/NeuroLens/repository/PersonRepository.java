package com.Cloud.NeuroLens.repository;

import com.Cloud.NeuroLens.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PersonRepository extends JpaRepository<Person, String> {

    Optional<Person> findByName(String name);
}
