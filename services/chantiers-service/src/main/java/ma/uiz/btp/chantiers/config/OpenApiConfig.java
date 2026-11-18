package ma.uiz.btp.chantiers.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    OpenAPI openApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Chantiers Service")
                        .version("0.1.0")
                        .description("Module Chantiers - Gestion de chantiers BTP (Équipe 18). "
                                + "Via la gateway (:8080), toutes les routes sauf "
                                + "POST /api/auth/login exigent un jeton (ADR-0006)."))
                .components(new Components().addSecuritySchemes("jwt", new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
    }
}
