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
package org.cibseven.modeler.rest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

@ApiResponses({ @ApiResponse(responseCode = "500", description = "An unexpected system error occured") })
@RestController
@RequestMapping("${cibseven.webclient.services.basePath:/services/v1}/modeler-info")
public class InfoService {

	@Value("${cibseven.webclient.services.basePath:}") private String servicesBasePath;

	@Operation(
			summary = "Get info version",
			description = "<strong>Return: Info (SNAPSHOT) version")
	@RequestMapping(method = RequestMethod.GET)
	public String getImplementationVersion() {
		String pack = InfoService.class.getPackage().getSpecificationVersion();
		if (pack != null && pack.endsWith("SNAPSHOT"))
			pack += " " + InfoService.class.getPackage().getImplementationVersion();
		return pack;
	}

	@Operation(
			summary = "Get config Properties",
			description = "<strong>Return: Config properties JSON object")
	@RequestMapping(value = "/properties", method = RequestMethod.GET)
	public ObjectNode getConfigProperties() {
		ObjectNode configJson = JsonNodeFactory.instance.objectNode();
		configJson.put("servicesBasePath", servicesBasePath);
		return configJson;
	}

}
