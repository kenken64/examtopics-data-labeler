package com.examtopics.aiagent.config;

import dev.langchain4j.model.chat.ChatLanguageModel;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.mongodb.config.AbstractReactiveMongoConfiguration;
import org.springframework.data.mongodb.repository.config.EnableReactiveMongoRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.reactive.config.EnableWebFlux;

@Configuration
@EnableWebFlux
@EnableAsync
@EnableReactiveMongoRepositories(basePackages = "com.examtopics.aiagent.repository")
public class AgentConfiguration extends AbstractReactiveMongoConfiguration {
    
    @Value("${spring.data.mongodb.database:ai-agent}")
    private String databaseName;
    
    @Override
    protected String getDatabaseName() {
        return databaseName;
    }
    
    @Bean
    @Primary
    public ChatModel chatModel(@Value("${spring.ai.openai.api-key}") String apiKey) {
        OpenAiApi openAiApi = new OpenAiApi(apiKey);
        return new OpenAiChatModel(openAiApi);
    }
    
    @Bean
    public ChatLanguageModel chatLanguageModel(
            @Value("${langchain4j.open-ai.chat-model.api-key}") String apiKey,
            @Value("${langchain4j.open-ai.chat-model.model-name:gpt-4}") String modelName,
            @Value("${langchain4j.open-ai.chat-model.temperature:0.7}") Double temperature,
            @Value("${langchain4j.open-ai.chat-model.max-tokens:2000}") Integer maxTokens) {
        
        return dev.langchain4j.model.openai.OpenAiChatModel.builder()
                .apiKey(apiKey)
                .modelName(modelName)
                .temperature(temperature)
                .maxTokens(maxTokens)
                .build();
    }
}