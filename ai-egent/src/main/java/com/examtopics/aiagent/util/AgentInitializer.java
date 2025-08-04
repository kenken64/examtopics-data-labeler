package com.examtopics.aiagent.util;

import com.examtopics.aiagent.model.Agent;
import com.examtopics.aiagent.repository.AgentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;

/**
 * Utility class to create the ETL agent if it doesn't exist
 * This will run automatically when the application starts
 */
@Component
public class AgentInitializer implements CommandLineRunner {
    
    private static final Logger logger = LoggerFactory.getLogger(AgentInitializer.class);
    
    @Autowired
    private AgentRepository agentRepository;
    
    @Override
    public void run(String... args) throws Exception {
        createETLAgentIfNotExists().block();
    }
    
    public Mono<Void> createETLAgentIfNotExists() {
        String agentName = "ETL";
        
        logger.info("🔍 Checking if ETL agent exists...");
        
        return agentRepository.existsByName(agentName)
            .flatMap(exists -> {
                if (exists) {
                    logger.info("✅ ETL agent already exists");
                    return Mono.empty();
                } else {
                    logger.info("🚀 Creating ETL agent...");
                    return createETLAgent();
                }
            })
            .doOnError(error -> logger.error("🚨 Error during ETL agent initialization: {}", error.getMessage()))
            .onErrorResume(error -> Mono.empty());
    }
    
    private Mono<Void> createETLAgent() {
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
                logger.info("✅ ETL agent created successfully with ID: {}", savedAgent.getId());
                logger.info("📊 Agent details - Name: {}, Status: {}, Type: {}", 
                    savedAgent.getName(), savedAgent.getStatus(), savedAgent.getType());
            })
            .doOnError(error -> logger.error("🚨 Failed to create ETL agent: {}", error.getMessage()))
            .then();
    }
    
    /**
     * Method to manually trigger agent creation (for testing purposes)
     */
    public Mono<Agent> forceCreateETLAgent() {
        logger.info("🔧 Force creating ETL agent...");
        
        Agent etlAgent = new Agent();
        etlAgent.setName("ETL");
        etlAgent.setDescription("This AI Agent extract, transform and load question from the PDF to the database");
        etlAgent.setType("assistant");
        etlAgent.setStatus(Agent.AgentStatus.ACTIVE);
        etlAgent.setVersion("1.0.0");
        
        Map<String, Object> capabilities = new HashMap<>();
        capabilities.put("pdf_extraction", true);
        capabilities.put("question_processing", true);
        capabilities.put("data_transformation", true);
        capabilities.put("database_operations", true);
        etlAgent.setCapabilities(capabilities);
        
        Map<String, Object> configuration = new HashMap<>();
        configuration.put("model", "gpt-4");
        configuration.put("temperature", 0.7);
        configuration.put("max_tokens", 2000);
        etlAgent.setConfiguration(configuration);
        
        return agentRepository.save(etlAgent)
            .doOnSuccess(savedAgent -> logger.info("✅ ETL agent force created with ID: {}", savedAgent.getId()));
    }
}
