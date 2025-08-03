package com.examtopics.aiagent.service;

import com.examtopics.aiagent.model.AgentTask;
import com.examtopics.aiagent.repository.AgentTaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

@Service
public class TaskExecutorService {
    
    private static final Logger logger = LoggerFactory.getLogger(TaskExecutorService.class);
    
    private final AgentTaskRepository taskRepository;
    private final Executor taskExecutor;
    
    public TaskExecutorService(AgentTaskRepository taskRepository) {
        this.taskRepository = taskRepository;
        this.taskExecutor = Executors.newFixedThreadPool(10);
    }
    
    public Mono<AgentTask> processTaskResult(AgentTask task, AgentTask result) {
        return Mono.fromCallable(() -> {
            logger.info("Processing result for task: {}", task.getId());
            
            task.setOutput(result.getOutput());
            task.setAssignedAgent(result.getAssignedAgent());
            task.setCompletedAt(LocalDateTime.now());
            
            return task;
        });
    }
    
    public CompletableFuture<AgentTask> executeAsync(AgentTask task) {
        return CompletableFuture.supplyAsync(() -> {
            logger.info("Executing task asynchronously: {}", task.getId());
            task.setStartedAt(LocalDateTime.now());
            task.setStatus(AgentTask.TaskStatus.RUNNING);
            
            try {
                Thread.sleep(1000);
                
                task.setOutput("Task completed successfully");
                task.setStatus(AgentTask.TaskStatus.COMPLETED);
                task.setCompletedAt(LocalDateTime.now());
                
                return task;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                task.setStatus(AgentTask.TaskStatus.FAILED);
                task.setErrorMessage("Task was interrupted");
                throw new RuntimeException("Task execution interrupted", e);
            }
        }, taskExecutor);
    }
    
    public Mono<AgentTask> scheduleTask(AgentTask task, long delayMillis) {
        return Mono.delay(java.time.Duration.ofMillis(delayMillis))
            .then(taskRepository.save(task))
            .doOnSuccess(savedTask -> 
                logger.info("Scheduled task {} to execute in {}ms", savedTask.getId(), delayMillis));
    }
}