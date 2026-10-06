package com.Cloud.NeuroLens.repository;

import com.Cloud.NeuroLens.model.Sighting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SightingRepository extends JpaRepository<Sighting, String> {

    List<Sighting> findByPersonIdOrderByTimestampDesc(String personId);
}
