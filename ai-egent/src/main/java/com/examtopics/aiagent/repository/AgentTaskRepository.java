package com.examtopics.aiagent.repository;

import com.examtopics.aiagent.model.AgentTask;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface AgentTaskRepository extends ReactiveMongoRepository<AgentTask, String> {
    
    Flux<AgentTask> findByStatusOrderByPriorityDescCreatedAtAsc(AgentTask.TaskStatus status);
    
    Flux<AgentTask> findByTypeAndStatusOrderByPriorityDescCreatedAtAsc(String type, AgentTask.TaskStatus status);
    
    Flux<AgentTask> findByAssignedAgentOrderByCreatedAtDesc(String assignedAgent);
}