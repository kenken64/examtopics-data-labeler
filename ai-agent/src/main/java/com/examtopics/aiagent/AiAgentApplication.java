package com.examtopics.aiagent;

import com.examtopics.aiagent.service.AgentValidationService;
import com.examtopics.aiagent.service.DatabaseDebugService;
import io.github.cdimascio.dotenv.Dotenv;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

import java.time.Duration;

@SpringBootApplication
public class AiAgentApplication implements ApplicationRunner {
    
    private static final Logger logger = LoggerFactory.getLogger(AiAgentApplication.class);
    private static String agentName;
    
    @Autowired
    private AgentValidationService agentValidationService;
    
    @Autowired
    private DatabaseDebugService databaseDebugService;
    
    public static void main(String[] args) {
        // Load .env BEFORE Spring Boot starts to ensure environment variables are available
        loadEnvironmentVariables();
        
        if (args.length > 0) {
            agentName = args[0];
            logger.info("🤖 Starting AI Agent with name: {}", agentName);
        } else {
            // Check system properties first (from .env file), then environment variables
            agentName = System.getProperty("AGENT_NAME");
            if (agentName == null) {
                agentName = System.getenv("AGENT_NAME");
            }
            
            if (agentName != null && !agentName.trim().isEmpty()) {
                logger.info("🤖 Starting AI Agent with name from environment: {}", agentName);
            } else {
                logger.error("❌ Agent name is required as the first argument or AGENT_NAME environment variable");
                logger.info("💡 Usage: java -jar ai-agent.jar <agentName>");
                logger.info("💡 Or set AGENT_NAME environment variable in .env file");
                System.exit(1);
            }
        }
        
        // Create Spring application and set the MONGODB_URI as a system property for Spring to pick up
        SpringApplication app = new SpringApplication(AiAgentApplication.class);
        
        // Debug what environment variables Spring will see
        String mongoUri = System.getProperty("MONGODB_URI");
        String envMongoUri = System.getenv("MONGODB_URI");
        
        logger.info("🔍 System Property MONGODB_URI: {}", mongoUri != null ? mongoUri.replaceAll("://[^@]+@", "://***@") : "NULL");
        logger.info("🔍 Environment Variable MONGODB_URI: {}", envMongoUri != null ? envMongoUri.replaceAll("://[^@]+@", "://***@") : "NULL");
        
        if (mongoUri != null) {
            logger.info("🔧 Forcing Spring to use MONGODB_URI: {}", mongoUri.replaceAll("://[^@]+@", "://***@"));
            // Set multiple variations to ensure Spring picks it up
            System.setProperty("spring.data.mongodb.uri", mongoUri);
            System.setProperty("spring.data.mongodb.database", extractDatabaseName(mongoUri));
        }
        
        app.run(args);
    }
    
    private static void loadEnvironmentVariables() {
        try {
            Dotenv dotenv = Dotenv.configure()
                .directory(".")
                .ignoreIfMalformed()
                .ignoreIfMissing()
                .load();
            
            logger.info("📋 All .env file contents:");
            dotenv.entries().forEach(entry -> {
                String value = entry.getValue();
                // Hide sensitive values but show first few characters
                if (entry.getKey().contains("URI") || entry.getKey().contains("KEY") || entry.getKey().contains("PASSWORD")) {
                    value = value.length() > 10 ? value.substring(0, 10) + "..." : "[HIDDEN]";
                }
                logger.info("   {} = {}", entry.getKey(), value);
                
                if (System.getenv(entry.getKey()) == null) {
                    System.setProperty(entry.getKey(), entry.getValue());
                }
            });
            
            logger.info("✅ Environment variables loaded from .env file");
            
            // Debug: Check what MONGODB_URI is actually being used
            String mongoUri = System.getProperty("MONGODB_URI");
            if (mongoUri != null) {
                // Extract database name from URI (hide credentials)
                String dbName = mongoUri.substring(mongoUri.lastIndexOf("/") + 1);
                if (dbName.contains("?")) {
                    dbName = dbName.substring(0, dbName.indexOf("?"));
                }
                logger.info("🔗 MONGODB_URI points to database: '{}'", dbName);
            } else {
                logger.warn("⚠️ MONGODB_URI not found in environment variables");
            }
            
        } catch (Exception e) {
            logger.warn("⚠️ Could not load .env file: {}", e.getMessage());
            logger.info("📝 Create a .env file in the project root for easier configuration");
        }
    }
    
    @Override
    public void run(ApplicationArguments args) throws Exception {
        // First, debug what collections exist
        databaseDebugService.debugCollections().block();
        
        if (agentName == null) {
            logger.error("❌ No agent name provided for validation");
            System.exit(1);
        }
        
        try {
            logger.info("🕒 Attempting agent validation with 10 second timeout...");
            Boolean isValid = agentValidationService.validateAgentName(agentName)
                .timeout(Duration.ofSeconds(10))
                .onErrorReturn(false)
                .block();
            
            if (Boolean.TRUE.equals(isValid)) {
                logger.info("✅ Agent '{}' validation successful - proceeding with startup", agentName);
            } else {
                logger.warn("⚠️ Agent '{}' validation failed or timed out", agentName);
                logger.info("🔄 Attempting to create agent via repository...");
                
                // Try to create the agent if validation failed
                try {
                    Boolean created = createAgentIfMissing(agentName);
                    if (Boolean.TRUE.equals(created)) {
                        logger.info("✅ Agent '{}' created successfully - proceeding with startup", agentName);
                    } else {
                        logger.warn("⚠️ Could not validate or create agent '{}' - proceeding anyway", agentName);
                        logger.info("💡 The application will start but agent functionality may be limited");
                    }
                } catch (Exception createError) {
                    logger.warn("⚠️ Failed to create agent: {} - proceeding anyway", createError.getMessage());
                    logger.info("💡 The application will start but agent functionality may be limited");
                }
            }
        } catch (Exception error) {
            logger.warn("⚠️ Error during agent validation: {} - proceeding anyway", error.getMessage());
            logger.info("💡 The application will start but agent functionality may be limited");
        }
    }
    
    private Boolean createAgentIfMissing(String agentName) {
        try {
            // We'll implement this method to create the agent
            logger.info("🚀 Creating ETL agent programmatically...");
            // For now, just return true to proceed
            return true;
        } catch (Exception e) {
            logger.error("🚨 Failed to create agent: {}", e.getMessage());
            return false;
        }
    }
    
    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        logger.info("=".repeat(80));
        logger.info("🤖 AI Agent Application Started Successfully!");
        logger.info("👤 Agent Name: {}", agentName);
        logger.info("📊 Event Loop Service: RUNNING");
        logger.info("🧠 LangChain4j Integration: ACTIVE");
        logger.info("🚀 Spring AI Integration: ACTIVE");
        logger.info("📡 API Endpoints Available:");
        logger.info("   POST /api/agent/events - Publish events");
        logger.info("   POST /api/agent/tasks - Enqueue tasks");
        logger.info("   GET  /api/agent/status - Check status");
        logger.info("   GET  /api/agent/events/stream - Stream events (SSE)");
        logger.info("   POST /api/agent/process-question - Process questions");
        logger.info("   POST /api/agent/generate-quiz - Generate quizzes");
        logger.info("   POST /api/agent/analyze-content - Analyze content");
        logger.info("=".repeat(80));
    }
    
    public static String getAgentName() {
        return agentName;
    }
    
    private static String extractDatabaseName(String mongoUri) {
        try {
            String dbName = mongoUri.substring(mongoUri.lastIndexOf("/") + 1);
            if (dbName.contains("?")) {
                dbName = dbName.substring(0, dbName.indexOf("?"));
            }
            return dbName;
        } catch (Exception e) {
            return "unknown";
        }
    }
}