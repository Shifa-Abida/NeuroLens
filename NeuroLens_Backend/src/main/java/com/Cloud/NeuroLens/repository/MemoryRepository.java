package com.Cloud.NeuroLens.repository;

import com.Cloud.NeuroLens.model.Memory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MemoryRepository extends JpaRepository<Memory, String> {

    List<Memory> findByPersonId(String personId);

    List<Memory> findByPersonIdOrderByTimestampDesc(String personId);

    List<Memory> findByClientIdOrderByTimestampDesc(String clientId);

    List<Memory> findAllByOrderByTimestampDesc();
}