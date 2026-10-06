package com.Cloud.NeuroLens.repository;

import com.Cloud.NeuroLens.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConversationRepository extends JpaRepository<Conversation, String> {

    List<Conversation>
    findByPersonIdOrderByTimestampDesc(
            String personId);
}