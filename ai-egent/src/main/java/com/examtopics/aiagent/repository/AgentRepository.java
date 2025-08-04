package com.examtopics.aiagent.repository;

import com.examtopics.aiagent.model.Agent;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

@Repository
public interface AgentRepository extends ReactiveMongoRepository<Agent, String> {
    
    Mono<Agent> findByName(String name);
    
    Mono<Boolean> existsByName(String name);
    
    Mono<Agent> findByNameAndStatus(String name, Agent.AgentStatus status);
}