package com.examtopics.aiagent.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
public class DatabaseDebugService {
    
    private static final Logger logger = LoggerFactory.getLogger(DatabaseDebugService.class);
    
    @Autowired
    private ReactiveMongoTemplate mongoTemplate;
    
    public Mono<Void> debugCollections() {
        logger.info("🔍 Debugging MongoDB collections...");
        
        // Get database name
        String databaseName = mongoTemplate.getMongoDatabase().block().getName();
        logger.info("🏛️ Connected to MongoDB database: '{}'", databaseName);
        
        return mongoTemplate.getCollectionNames()
            .doOnNext(collectionName -> logger.info("📂 Found collection: {}", collectionName))
            .count()
            .doOnNext(count -> logger.info("📊 Total collections in database '{}': {}", databaseName, count))
            .then(checkAiAgentsVariations())
            .then();
    }
    
    private Mono<Void> checkAiAgentsVariations() {
        String[] possibleNames = {"ai_agents", "ai-agents", "aiagents", "agents", "ai_agent", "ai-agent"};
        
        logger.info("🔍 Checking for AI agent collections with different naming...");
        
        return Mono.fromRunnable(() -> {
            for (String name : possibleNames) {
                mongoTemplate.collectionExists(name)
                    .subscribe(exists -> {
                        if (exists) {
                            logger.info("✅ Collection '{}' exists", name);
                            // Check document count using mongoTemplate
                            mongoTemplate.count(new Query(), name)
                                .subscribe(count -> logger.info("📊 Collection '{}' has {} documents", name, count));
                        } else {
                            logger.debug("❌ Collection '{}' does not exist", name);
                        }
                    });
            }
        });
    }
}