package com.examtopics.aiagent.controller;

import com.examtopics.aiagent.model.Agent;
import com.examtopics.aiagent.model.AgentEvent;
import com.examtopics.aiagent.model.AgentTask;
import com.examtopics.aiagent.service.EventLoopService;
import com.examtopics.aiagent.repository.AgentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import jakarta.validation.Valid;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/agent")
@CrossOrigin(origins = "*")
public class AgentController {
    
    private static final Logger logger = LoggerFactory.getLogger(AgentController.class);
    
    private final EventLoopService eventLoopService;
    private final AgentRepository agentRepository;
    
    public AgentController(EventLoopService eventLoopService, AgentRepository agentRepository) {
        this.eventLoopService = eventLoopService;
        this.agentRepository = agentRepository;
    }
    
    @PostMapping("/events")
    public Mono<AgentEvent> publishEvent(@Valid @RequestBody EventRequest request) {
        logger.info("Publishing event of type: {}", request.getType());
        
        AgentEvent event = new AgentEvent(request.getType(), request.getSource(), request.getPayload());
        event.setMetadata(request.getMetadata());
        
        return eventLoopService.publishEvent(event);
    }
    
    @PostMapping("/tasks")
    public Mono<AgentTask> enqueueTask(@Valid @RequestBody TaskRequest request) {
        logger.info("Enqueuing task of type: {}", request.getType());
        
        AgentTask task = new AgentTask(request.getType(), request.getDescription(), request.getInput());
        task.setPriority(request.getPriority());
        task.setContext(request.getContext());
        task.setMaxRetries(request.getMaxRetries());
        
        return eventLoopService.enqueueTask(task);
    }
    
    @PostMapping("/create-etl-agent")
    public Mono<Agent> createETLAgent() {
        logger.info("Creating ETL agent via API...");
        
        Agent etlAgent = new Agent();
        etlAgent.setName("ETL");
        etlAgent.setDescription("This AI Agent extract, transform and load question from the PDF to the database");
        etlAgent.setType("assistant");
        etlAgent.setStatus(Agent.AgentStatus.ACTIVE);
        etlAgent.setVersion("1.0.0");
        
        // Set capabilities
        Map<String, Object> capabilities = new HashMap<>();
        capabilities.put("pdf_extraction", true);
        capabilities.put("question_processing", true);
        capabilities.put("data_transformation", true);
        capabilities.put("database_operations", true);
        etlAgent.setCapabilities(capabilities);
        
        // Set configuration
        Map<String, Object> configuration = new HashMap<>();
        configuration.put("model", "gpt-4");
        configuration.put("temperature", 0.7);
        configuration.put("max_tokens", 2000);
        etlAgent.setConfiguration(configuration);
        
        return agentRepository.save(etlAgent)
            .doOnSuccess(savedAgent -> {
                logger.info("✅ ETL agent created successfully via API with ID: {}", savedAgent.getId());
            })
            .doOnError(error -> logger.error("🚨 Failed to create ETL agent via API: {}", error.getMessage()));
    }
    
    @GetMapping("/check-etl-agent")
    public Mono<Map<String, Object>> checkETLAgent() {
        logger.info("Checking ETL agent status...");
        
        return agentRepository.findByName("ETL")
            .map(agent -> {
                Map<String, Object> response = new HashMap<>();
                response.put("exists", true);
                response.put("name", agent.getName());
                response.put("status", agent.getStatus());
                response.put("type", agent.getType());
                response.put("id", agent.getId());
                return response;
            })
            .switchIfEmpty(Mono.fromSupplier(() -> {
                Map<String, Object> response = new HashMap<>();
                response.put("exists", false);
                response.put("message", "ETL agent not found");
                return response;
            }));
    }
    
    @GetMapping(value = "/events/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamEvents() {
        return Flux.interval(Duration.ofSeconds(1))
            .map(sequence -> "data: Event " + sequence + " at " + System.currentTimeMillis() + "\n\n");
    }
    
    @GetMapping("/status")
    public Mono<Map<String, Object>> getStatus() {
        return Mono.just(Map.of(
            "status", eventLoopService.isRunning() ? "running" : "stopped",
            "timestamp", System.currentTimeMillis()
        ));
    }
    
    @PostMapping("/process-question")
    public Mono<AgentEvent> processQuestion(@RequestBody Map<String, String> request) {
        String question = request.get("question");
        logger.info("Processing question: {}", question);
        
        AgentEvent event = new AgentEvent("QUESTION_ANALYSIS", "api", question);
        return eventLoopService.publishEvent(event);
    }
    
    @PostMapping("/generate-quiz")
    public Mono<AgentTask> generateQuiz(@RequestBody Map<String, Object> request) {
        String topic = (String) request.get("topic");
        Integer difficulty = (Integer) request.getOrDefault("difficulty", 1);
        
        logger.info("Generating quiz for topic: {} with difficulty: {}", topic, difficulty);
        
        AgentTask task = new AgentTask("QUIZ_GENERATION", "Generate quiz for topic", topic);
        task.setPriority(difficulty);
        task.setContext(Map.of("difficulty", difficulty));
        
        return eventLoopService.enqueueTask(task);
    }
    
    @PostMapping("/analyze-content")
    public Mono<AgentTask> analyzeContent(@RequestBody Map<String, String> request) {
        String content = request.get("content");
        logger.info("Analyzing content of length: {}", content.length());
        
        AgentTask task = new AgentTask("CONTENT_ANALYSIS", "Analyze content for insights", content);
        return eventLoopService.enqueueTask(task);
    }
    
    public static class EventRequest {
        private String type;
        private String source;
        private String payload;
        private Map<String, Object> metadata;
        
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        
        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }
        
        public String getPayload() { return payload; }
        public void setPayload(String payload) { this.payload = payload; }
        
        public Map<String, Object> getMetadata() { return metadata; }
        public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
    }
    
    public static class TaskRequest {
        private String type;
        private String description;
        private String input;
        private int priority = 0;
        private Map<String, Object> context;
        private int maxRetries = 3;
        
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        
        public String getInput() { return input; }
        public void setInput(String input) { this.input = input; }
        
        public int getPriority() { return priority; }
        public void setPriority(int priority) { this.priority = priority; }
        
        public Map<String, Object> getContext() { return context; }
        public void setContext(Map<String, Object> context) { this.context = context; }
        
        public int getMaxRetries() { return maxRetries; }
        public void setMaxRetries(int maxRetries) { this.maxRetries = maxRetries; }
    }
}