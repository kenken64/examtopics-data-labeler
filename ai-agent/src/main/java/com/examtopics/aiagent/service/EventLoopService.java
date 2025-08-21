package com.examtopics.aiagent.service;

import com.examtopics.aiagent.model.AgentEvent;
import com.examtopics.aiagent.model.AgentTask;
import com.examtopics.aiagent.repository.AgentEventRepository;
import com.examtopics.aiagent.repository.AgentTaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Schedulers;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class EventLoopService {
    
    private static final Logger logger = LoggerFactory.getLogger(EventLoopService.class);
    
    private final AgentEventRepository eventRepository;
    private final AgentTaskRepository taskRepository;
    private final AgentService agentService;
    
    @Value("${agent.event-loop.polling-interval:1000}")
    private long pollingInterval;
    
    @Value("${agent.processing.batch-size:10}")
    private int batchSize;
    
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final Sinks.Many<AgentEvent> eventSink = Sinks.many().multicast().onBackpressureBuffer();
    private final Sinks.Many<AgentTask> taskSink = Sinks.many().multicast().onBackpressureBuffer();
    private final ConcurrentHashMap<String, Boolean> processingEvents = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Boolean> processingTasks = new ConcurrentHashMap<>();
    
    public EventLoopService(AgentEventRepository eventRepository, 
                           AgentTaskRepository taskRepository,
                           AgentService agentService) {
        this.eventRepository = eventRepository;
        this.taskRepository = taskRepository;
        this.agentService = agentService;
    }
    
    @PostConstruct
    public void start() {
        if (running.compareAndSet(false, true)) {
            logger.info("Starting event loop service with polling interval: {}ms", pollingInterval);
            startEventLoop();
            startTaskLoop();
            startEventProcessor();
            startTaskProcessor();
        }
    }
    
    @PreDestroy
    public void stop() {
        if (running.compareAndSet(true, false)) {
            logger.info("Stopping event loop service");
            eventSink.tryEmitComplete();
            taskSink.tryEmitComplete();
        }
    }
    
    private void startEventLoop() {
        Flux.interval(Duration.ofMillis(pollingInterval))
            .takeWhile(tick -> running.get())
            .flatMap(tick -> loadPendingEvents())
            .doOnNext(event -> {
                logger.debug("Emitting event: {}", event.getId());
                eventSink.tryEmitNext(event);
            })
            .doOnError(error -> logger.error("Error in event loop", error))
            .retry()
            .subscribeOn(Schedulers.boundedElastic())
            .subscribe();
    }
    
    private void startTaskLoop() {
        Flux.interval(Duration.ofMillis(pollingInterval))
            .takeWhile(tick -> running.get())
            .flatMap(tick -> loadQueuedTasks())
            .doOnNext(task -> {
                logger.debug("Emitting task: {}", task.getId());
                taskSink.tryEmitNext(task);
            })
            .doOnError(error -> logger.error("Error in task loop", error))
            .retry()
            .subscribeOn(Schedulers.boundedElastic())
            .subscribe();
    }
    
    private void startEventProcessor() {
        eventSink.asFlux()
            .filter(event -> !processingEvents.containsKey(event.getId()))
            .flatMap(this::processEvent, 4)
            .doOnError(error -> logger.error("Error processing event", error))
            .retry()
            .subscribeOn(Schedulers.parallel())
            .subscribe();
    }
    
    private void startTaskProcessor() {
        taskSink.asFlux()
            .filter(task -> !processingTasks.containsKey(task.getId()))
            .flatMap(this::processTask, 4)
            .doOnError(error -> logger.error("Error processing task", error))
            .retry()
            .subscribeOn(Schedulers.parallel())
            .subscribe();
    }
    
    private Flux<AgentEvent> loadPendingEvents() {
        return eventRepository.findByStatusOrderByCreatedAtAsc(AgentEvent.EventStatus.PENDING)
            .take(batchSize);
    }
    
    private Flux<AgentTask> loadQueuedTasks() {
        return taskRepository.findByStatusOrderByPriorityDescCreatedAtAsc(AgentTask.TaskStatus.QUEUED)
            .take(batchSize);
    }
    
    private Mono<AgentEvent> processEvent(AgentEvent event) {
        return Mono.fromCallable(() -> {
            processingEvents.put(event.getId(), true);
            logger.info("Processing event: {} of type: {}", event.getId(), event.getType());
            return event;
        })
        .flatMap(this::updateEventStatus)
        .flatMap(agentService::handleEvent)
        .flatMap(this::markEventCompleted)
        .doOnError(error -> handleEventError(event, error))
        .doFinally(signal -> processingEvents.remove(event.getId()))
        .onErrorResume(error -> Mono.empty());
    }
    
    private Mono<AgentTask> processTask(AgentTask task) {
        return Mono.fromCallable(() -> {
            processingTasks.put(task.getId(), true);
            logger.info("Processing task: {} of type: {}", task.getId(), task.getType());
            return task;
        })
        .flatMap(this::updateTaskStatus)
        .flatMap(agentService::executeTask)
        .flatMap(this::markTaskCompleted)
        .doOnError(error -> handleTaskError(task, error))
        .doFinally(signal -> processingTasks.remove(task.getId()))
        .onErrorResume(error -> Mono.empty());
    }
    
    private Mono<AgentEvent> updateEventStatus(AgentEvent event) {
        event.setStatus(AgentEvent.EventStatus.PROCESSING);
        return eventRepository.save(event);
    }
    
    private Mono<AgentTask> updateTaskStatus(AgentTask task) {
        task.setStatus(AgentTask.TaskStatus.RUNNING);
        task.setStartedAt(LocalDateTime.now());
        return taskRepository.save(task);
    }
    
    private Mono<AgentEvent> markEventCompleted(AgentEvent event) {
        event.setStatus(AgentEvent.EventStatus.COMPLETED);
        event.setProcessedAt(LocalDateTime.now());
        return eventRepository.save(event);
    }
    
    private Mono<AgentTask> markTaskCompleted(AgentTask task) {
        task.setStatus(AgentTask.TaskStatus.COMPLETED);
        task.setCompletedAt(LocalDateTime.now());
        return taskRepository.save(task);
    }
    
    private void handleEventError(AgentEvent event, Throwable error) {
        logger.error("Error processing event {}: {}", event.getId(), error.getMessage());
        event.setErrorMessage(error.getMessage());
        event.incrementRetryCount();
        
        if (event.getRetryCount() < 3) {
            event.setStatus(AgentEvent.EventStatus.RETRY);
        } else {
            event.setStatus(AgentEvent.EventStatus.FAILED);
        }
        
        eventRepository.save(event).subscribe();
    }
    
    private void handleTaskError(AgentTask task, Throwable error) {
        logger.error("Error processing task {}: {}", task.getId(), error.getMessage());
        task.setErrorMessage(error.getMessage());
        task.incrementRetryCount();
        
        if (task.canRetry()) {
            task.setStatus(AgentTask.TaskStatus.RETRY);
        } else {
            task.setStatus(AgentTask.TaskStatus.FAILED);
        }
        
        taskRepository.save(task).subscribe();
    }
    
    public Mono<AgentEvent> publishEvent(AgentEvent event) {
        return eventRepository.save(event)
            .doOnSuccess(savedEvent -> logger.info("Published event: {}", savedEvent.getId()));
    }
    
    public Mono<AgentTask> enqueueTask(AgentTask task) {
        return taskRepository.save(task)
            .doOnSuccess(savedTask -> logger.info("Enqueued task: {}", savedTask.getId()));
    }
    
    public boolean isRunning() {
        return running.get();
    }
}