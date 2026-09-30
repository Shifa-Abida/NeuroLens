package com.Cloud.NeuroLens.repository;

import com.Cloud.NeuroLens.model.EmotionLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface EmotionLogRepository
        extends MongoRepository<EmotionLog, String> {

    List<EmotionLog> findByPersonIdOrderByTimestampDesc(
            String personId);
}
