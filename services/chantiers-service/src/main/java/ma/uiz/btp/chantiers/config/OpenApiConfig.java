package ma.uiz.btp.chantiers.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    OpenAPI openApi() {
        return new OpenAPI().info(new Info()
                .title("Chantiers Service")
                .version("0.1.0")
                .description("Module Chantiers - Gestion de chantiers BTP (Équipe 18)"));
    }
}
