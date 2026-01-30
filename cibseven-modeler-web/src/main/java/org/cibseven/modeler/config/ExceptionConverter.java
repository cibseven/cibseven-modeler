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
package org.cibseven.modeler.config;

import java.util.Arrays;
import java.util.Map;

import org.cibseven.modeler.exception.SystemException;
import org.cibseven.webapp.auth.exception.AuthenticationException;
import org.cibseven.webapp.exception.NoObjectException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;

import com.fasterxml.jackson.databind.exc.InvalidFormatException;

@ControllerAdvice
@ResponseBody
public class ExceptionConverter {

	@ExceptionHandler
	@ResponseStatus(HttpStatus.UNAUTHORIZED)
	public Map<String, Object> authentication(AuthenticationException x) {
		return Map.of(
			"error", x.getClass().getSimpleName(),
			"message", x.getMessage() != null ? x.getMessage() : "Authentication failed"
		);
	}

	@ExceptionHandler
	@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
	public Map<String, Object> system(SystemException x) {
		return Map.of(
			"error", x.getClass().getSimpleName(),
			"message", x.getMessage() != null ? x.getMessage() : "System error"
		);
	}

	@ExceptionHandler
	@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
	public Map<String, Object> runtime(RuntimeException x) {
		return Map.of(
			"error", x.getClass().getSimpleName(),
			"message", x.getMessage() != null ? x.getMessage() : "Unexpected error"
		);
	}

	@ExceptionHandler
	@ResponseStatus(HttpStatus.NOT_FOUND)
	public Map<String, Object> notFound(NoObjectException exception) {
		return Map.of(
			"error", "NoObjectException",
			"message", exception.getMessage() != null ? exception.getMessage() : "Object not found"
		);
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<Map<String, Object>> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
		Throwable cause = ex.getMostSpecificCause();
		String message;

		if (cause instanceof InvalidFormatException) {
			InvalidFormatException invalidFormat = (InvalidFormatException) cause;
			if (invalidFormat.getTargetType().isEnum()) {
				String field = invalidFormat.getPath().get(0).getFieldName();
				Object invalidValue = invalidFormat.getValue();
				String allowedValues = Arrays.toString(invalidFormat.getTargetType().getEnumConstants());

				message = "Invalid enum value '" + invalidValue + "' for field '" + field + "'. Allowed values: " + allowedValues;
			} else {
				message = cause.getMessage();
			}
		} else {
			message = cause != null ? cause.getMessage() : ex.getMessage();
		}

		return ResponseEntity.badRequest().body(Map.of(
			"error", "Malformed request body",
			"message", message
		));
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<Map<String, Object>> handleDuplicateKey(DataIntegrityViolationException ex) {
		Throwable cause = ex.getCause();
		String message;

		if (cause instanceof org.hibernate.exception.ConstraintViolationException) {
			org.hibernate.exception.ConstraintViolationException cve = (org.hibernate.exception.ConstraintViolationException) cause;
			String constraint = cve.getConstraintName();
			message = "Unique constraint violated: " + constraint;
		} else {
			message = ex.getMostSpecificCause().getMessage();
		}

		return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
			"error", "Duplicate resource",
			"message", message
		));
	}
}
