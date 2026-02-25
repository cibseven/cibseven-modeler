/*
 * Copyright CIB software GmbH and/or licensed to CIB software GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. CIB software licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
package org.cibseven.modeler;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import org.cibseven.modeler.config.ElementTemplateProperties;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.cibseven.modeler.model.ElementTemplate;
import org.cibseven.modeler.model.ElementTemplateOrigin;
import org.cibseven.modeler.repository.ElementTemplateRepository;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class ElementTemplateLoader implements InitializingBean {
	
	private final ObjectMapper mapper;
	private final ElementTemplateRepository elementTemplateRepository;
    private final ElementTemplateProperties properties;
    private final TransactionTemplate transactionTemplate;
    private final ResourceLoader resourceLoader;

	public ElementTemplateLoader(ElementTemplateRepository elementTemplateRepository, ObjectMapper mapper, ElementTemplateProperties properties, TransactionTemplate transactionTemplate, ResourceLoader resourceLoader) {
	    this.elementTemplateRepository = elementTemplateRepository;
	    this.mapper = mapper;
        this.properties = properties;
        this.transactionTemplate = transactionTemplate;
        this.resourceLoader = resourceLoader;
	}

	@Override
	public void afterPropertiesSet() throws Exception {
        // Ensure all DB interactions (including LOB reads/writes) happen within a transaction
        transactionTemplate.executeWithoutResult(status -> populateElementTemplatesDatabase());
	}
	
	private void populateElementTemplatesDatabase() {
        for (String path : properties.getPaths()) {
            loadElementTemplatesFromJson(path);
        }
	}
	
	private void loadElementTemplatesFromJson(String path) {
		assert(path != null && !path.isBlank());

        Resource resource = resourceLoader.getResource(path);

        if (!resource.exists()) {
            log.warn("Element templates file not found at '{}'. Skipping this file.", path);
            return;
        }

        try (InputStream inputStream = resource.getInputStream()) {
			
			log.info("Loading element templates from JSON at '{}'...", path);
			
			// First read the JSON as JsonNode array to preserve the original JSON content
			JsonNode jsonArray = mapper.readTree(inputStream);
	        
	        if (!jsonArray.isArray()) {
	        	log.error("Expected JSON array in file '{}', but found: {}", path, jsonArray.getNodeType());
	        	return;
	        }
	        
	        log.info("Element templates: {}", jsonArray.size());
	        
	        List<ElementTemplate> newTemplates = new java.util.ArrayList<>();
	        
	        for (JsonNode templateNode : jsonArray) {
	        	try {
	        		// Convert JsonNode to ElementTemplate object
	        		ElementTemplate jsonTemplate = mapper.treeToValue(templateNode, ElementTemplate.class);
                    jsonTemplate.setOrigin(ElementTemplateOrigin.DEFAULT_JSON);
                    jsonTemplate.setContent(mapper.writeValueAsString(templateNode));
					
	        		ElementTemplate existing = elementTemplateRepository.findElementTemplateById(jsonTemplate.getTemplateId());
					
	        		if (existing != null) {
                        jsonTemplate.setId(existing.getId());
                        elementTemplateRepository.save(jsonTemplate);
                    } else {
                        newTemplates.add(jsonTemplate);
	        		}
	        	} catch (Exception e) {
	        		log.error("Error processing template from '{}': {}", path, e.getMessage(), e);
	        	}
	        }

            if (!newTemplates.isEmpty()) {
                elementTemplateRepository.saveAll(newTemplates);
            }

            log.info("Successfully loaded {} element templates from '{}': {} updated, {} inserted",
                    jsonArray.size(), path,
                    jsonArray.size() - newTemplates.size(),
                    newTemplates.size());
		}
		catch (IOException ioe) {
            log.error("Failed to read element templates JSON at '{}'", path, ioe);
		}
	}

}
