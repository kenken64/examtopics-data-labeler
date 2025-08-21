package com.examtopics.aiagent.service;

import com.examtopics.aiagent.model.Agent;
import com.examtopics.aiagent.repository.AgentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
public class AgentValidationService {
    
    private static final Logger logger = LoggerFactory.getLogger(AgentValidationService.class);
    
    @Autowired
    private AgentRepository agentRepository;
    
    public Mono<Boolean> validateAgentName(String agentName) {
        if (agentName == null || agentName.trim().isEmpty()) {
            logger.warn("❌ Agent name validation failed: Agent name is null or empty");
            return Mono.just(false);
        }
        
        logger.info("🔍 Validating agent name: {}", agentName);
        logger.info("🔍 Looking in ai_agents collection for agent with name: {}", agentName.trim());
        
        // Debug: Let's also try to find all agents to see what's in the collection
        return agentRepository.findAll()
            .doOnNext(agent -> logger.debug("🔍 Found agent in collection: name='{}', id='{}'", agent.getName(), agent.getId()))
            .count()
            .doOnNext(count -> logger.info("📊 Total agents in ai_agents collection: {}", count))
            .then(agentRepository.existsByName(agentName.trim()))
            .doOnNext(exists -> {
                if (exists) {
                    logger.info("✅ Agent '{}' found in ai_agents collection", agentName);
                } else {
                    logger.warn("❌ Agent '{}' not found in ai_agents collection", agentName);
                }
            })
            .onErrorResume(error -> {
                logger.error("🚨 Error validating agent name '{}': {}", agentName, error.getMessage());
                return Mono.just(false);
            });
    }
    
    public Mono<Agent> getValidAgent(String agentName) {
        if (agentName == null || agentName.trim().isEmpty()) {
            logger.warn("❌ Cannot retrieve agent: Agent name is null or empty");
            return Mono.empty();
        }
        
        logger.info("🔍 Retrieving agent: {}", agentName);
        
        return agentRepository.findByName(agentName.trim())
            .doOnNext(agent -> logger.info("✅ Agent '{}' retrieved successfully", agentName))
            .doOnError(error -> logger.error("🚨 Error retrieving agent '{}': {}", agentName, error.getMessage()))
            .onErrorResume(error -> Mono.empty());
    }
    
    public Mono<Boolean> validateActiveAgent(String agentName) {
        if (agentName == null || agentName.trim().isEmpty()) {
            logger.warn("❌ Active agent validation failed: Agent name is null or empty");
            return Mono.just(false);
        }
        
        logger.info("🔍 Validating active agent: {}", agentName);
        
        return agentRepository.findByNameAndStatus(agentName.trim(), Agent.AgentStatus.ACTIVE)
            .hasElement()
            .doOnNext(isActive -> {
                if (isActive) {
                    logger.info("✅ Agent '{}' is active and valid", agentName);
                } else {
                    logger.warn("❌ Agent '{}' is not active or does not exist", agentName);
                }
            })
            .onErrorResume(error -> {
                logger.error("🚨 Error validating active agent '{}': {}", agentName, error.getMessage());
                return Mono.just(false);
            });
    }
}