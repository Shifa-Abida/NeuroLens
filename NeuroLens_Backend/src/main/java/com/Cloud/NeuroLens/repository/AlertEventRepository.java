package com.Cloud.NeuroLens.repository;

import com.Cloud.NeuroLens.model.AlertEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertEventRepository extends JpaRepository<AlertEvent, String> {

    List<AlertEvent> findAllByOrderByTimestampDesc();

    List<AlertEvent> findByStatusOrderByTimestampDesc(String status);
}
