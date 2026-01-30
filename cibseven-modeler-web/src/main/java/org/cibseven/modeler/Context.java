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

import java.lang.reflect.InvocationTargetException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import lombok.extern.slf4j.Slf4j;
import org.cibseven.webapp.auth.BaseUserProvider;
import org.cibseven.webapp.auth.CIBUser;
import org.cibseven.webapp.auth.User;
import org.cibseven.webapp.providers.BpmProvider;
import org.cibseven.webapp.rest.CustomRestTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.core.MethodParameter;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.http.CacheControl;
import org.springframework.http.converter.ByteArrayHttpMessageConverter;
import org.springframework.http.converter.FormHttpMessageConverter;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.ResourceHttpMessageConverter;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.config.annotation.ContentNegotiationConfigurer;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.mvc.WebContentInterceptor;

@Configuration
@EnableJpaRepositories(basePackages = "org.cibseven.modeler.repository")
@ComponentScan(
		basePackages = {
				"org.cibseven.modeler",
				"org.cibseven.webapp.providers",
				"org.cibseven.webapp.auth"
		},
		excludeFilters = @ComponentScan.Filter(
				type = FilterType.REGEX,
				pattern = {
						"org\\.cibseven\\.webapp\\.rest\\..*",  // Exclude all webclient REST services
						"org\\.cibseven\\.webapp\\.providers\\.BpmProvider"  // Modeler has its own BpmProvider
				}
		)
)
@EnableScheduling @Slf4j
public class Context implements WebMvcConfigurer, HandlerMethodArgumentResolver {
	
	BaseUserProvider provider;

    @Value("${cibsevenmodeler.authentication.enabled:true}")
    private boolean authenticationEnabled;
	
	@Override
	public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        converters.add(new ResourceHttpMessageConverter()); // needed for DocumentService.download
		converters.add(new StringHttpMessageConverter(StandardCharsets.UTF_8)); // needed for UiService
		converters.add(new ByteArrayHttpMessageConverter()); // needed for fetching data variables
		converters.add(new FormHttpMessageConverter());		
        converters.add(new MappingJackson2HttpMessageConverter());
	}

	@Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedMethods("GET", "POST", "DELETE" , "PUT", "PATCH");
    }
	
	@Override // https://stackoverflow.com/questions/16332092/spring-mvc-pathvariable-with-dot-is-getting-truncated
	public void configurePathMatch(PathMatchConfigurer configurer) {
		configurer.setUseSuffixPatternMatch(false);
	}
	
	@Override
    public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
		configurer.favorPathExtension(false);
    }
	
	@Override // http://www.webjars.org/documentation
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		registry.addResourceHandler("/webjars/**").addResourceLocations("/webjars/");
	}	
	
	@Override
	public void addViewControllers(ViewControllerRegistry registry) {
		registry.addViewController("/").setViewName("forward:/index.html");
	}
	
	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		WebContentInterceptor cacheConfig = new WebContentInterceptor();		
		cacheConfig.setCacheControl(CacheControl.noCache());
		registry.addInterceptor(cacheConfig);
	}
	
	@Override
	public void addArgumentResolvers(List<HandlerMethodArgumentResolver> argumentResolvers) {
		argumentResolvers.add(this);
	}
	
	@Override
	public boolean supportsParameter(MethodParameter parameter) {
		return User.class.isAssignableFrom(parameter.getParameterType());
	}

    /**
     * Resolves the User parameter by authenticating the user from the request.
     * This allows controller methods to receive User objects directly as parameters.
     * When authentication is disabled, returns a default user that allows all operations.
     *
     * @param parameter The method parameter to resolve
     * @param mavContainer The model and view container
     * @param rq The web request
     * @param binderFactory The data binder factory
     * @return The authenticated User object or default user when authentication is disabled
     */
    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer, NativeWebRequest rq, WebDataBinderFactory binderFactory) {
        if (!authenticationEnabled) {
            log.debug("Authentication is disabled, returning default user");
            return createDefaultUser();
        }

        log.debug("Authentication is enabled, authenticating user");
        return provider.authenticateUser(((ServletWebRequest) rq).getRequest());
    }

    /**
     * Creates a default user when authentication is disabled.
     * This user has minimal required properties to prevent null pointer exceptions.
     * The user identifier "default-user" will be used for permission checks.
     *
     * @return A default CIBUser object
     */
    private CIBUser createDefaultUser() {
        // Create a default user that will work with getUserIdentifier method
        // The getUserIdentifier method will fall back to getId() or toString()
        CIBUser defaultUser = new CIBUser();

        // Try to set ID using reflection since direct setter might not exist
        try {
            java.lang.reflect.Field idField = defaultUser.getClass().getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(defaultUser, "default-user");
            log.debug("Created default user with ID: default-user");
        } catch (Exception e) {
            // If reflection fails, the getUserIdentifier will use toString() as fallback
            log.debug("Could not set ID via reflection, getUserIdentifier will use toString()");
        }

        return defaultUser;
    }

	@Bean @Primary
	public BpmProvider bpmProvider(@Value("${cibseven.webclient.bpm.provider}") Class<BpmProvider> providerClass)
			throws InstantiationException, IllegalAccessException, IllegalArgumentException,
			InvocationTargetException, NoSuchMethodException, SecurityException {
		return (BpmProvider) providerClass.getConstructor().newInstance();
	}
	
	@Bean @Primary
	public BaseUserProvider flowUserProvider(@Value("${cibseven.webclient.user.provider}") Class<BaseUserProvider> providerClass)
			throws InstantiationException, IllegalAccessException, IllegalArgumentException, InvocationTargetException,
			NoSuchMethodException, SecurityException {
		this.provider = (BaseUserProvider) providerClass.getConstructor().newInstance();
		return provider;
	}
	
	@Bean // http://blog.codeleak.pl/2015/09/placeholders-support-in-value.html
    public static PropertySourcesPlaceholderConfigurer placeholderConfigurer() {
        return new PropertySourcesPlaceholderConfigurer();
    }

	/**
	 * Creates a custom RestTemplate bean with configurable settings.
	 * This can be injected into services that need to make HTTP requests.
	 *
	 * The bean is configured using properties from application.yaml under
	 * the cibseven.webclient.rest namespace.
	 *
	 * @return a configured CustomRestTemplate instance
	 */
	@Bean
	public CustomRestTemplate customRestTemplate() {
		// Create a new CustomRestTemplate instance
		// It will be configured via @PostConstruct using @Autowired dependencies
		return new CustomRestTemplate();
	}

}
