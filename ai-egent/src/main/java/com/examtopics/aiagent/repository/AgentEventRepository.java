package com.examtopics.aiagent.repository;

import com.examtopics.aiagent.model.AgentEvent;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface AgentEventRepository extends ReactiveMongoRepository<AgentEvent, String> {
    
    Flux<AgentEvent> findByStatusOrderByCreatedAtAsc(AgentEvent.EventStatus status);
    
    Flux<AgentEvent> findByTypeAndStatusOrderByCreatedAtAsc(String type, AgentEvent.EventStatus status);
    
    Flux<AgentEvent> findBySourceOrderByCreatedAtDesc(String source);
}