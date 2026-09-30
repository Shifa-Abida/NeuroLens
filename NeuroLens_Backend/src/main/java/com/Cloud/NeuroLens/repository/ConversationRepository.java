package com.Cloud.NeuroLens.repository;

import com.Cloud.NeuroLens.model.Conversation;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ConversationRepository
        extends MongoRepository<Conversation, String> {

    List<Conversation>
    findByPersonIdOrderByTimestampDesc(
            String personId);
}