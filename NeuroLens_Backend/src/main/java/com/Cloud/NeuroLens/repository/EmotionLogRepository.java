package com.Cloud.NeuroLens.repository;

import com.Cloud.NeuroLens.model.EmotionLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmotionLogRepository extends JpaRepository<EmotionLog, String> {

    List<EmotionLog> findByPersonIdOrderByTimestampDesc(
            String personId);
}
