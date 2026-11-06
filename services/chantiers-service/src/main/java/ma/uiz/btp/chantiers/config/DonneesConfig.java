package ma.uiz.btp.chantiers.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.flyway.FlywayDataSource;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.simple.JdbcClient;

import javax.sql.DataSource;

/**
 * Deux connexions à btp_db (ADR-0005 et ADR-0006) :
 * - principale : chantiers_user, schéma chantiers (JPA) ;
 * - auth : auth_user, schéma auth (comptes de connexion, Flyway).
 * Chaque utilisateur PostgreSQL n'a de droits que sur son schéma.
 */
@Configuration
public class DonneesConfig {

    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource")
    DataSourceProperties dataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource.hikari")
    HikariDataSource dataSource(DataSourceProperties dataSourceProperties) {
        return dataSourceProperties.initializeDataSourceBuilder()
                .type(HikariDataSource.class).build();
    }

    @Bean
    @ConfigurationProperties("auth.datasource")
    DataSourceProperties authDataSourceProperties() {
        return new DataSourceProperties();
    }

    /** Connexion du schéma auth ; Flyway n'applique ses migrations que sur elle. */
    @Bean
    @FlywayDataSource
    DataSource authDataSource(
            @Qualifier("authDataSourceProperties") DataSourceProperties proprietes) {
        HikariDataSource ds = proprietes.initializeDataSourceBuilder()
                .type(HikariDataSource.class).build();
        ds.setPoolName("auth");
        ds.setMaximumPoolSize(3);
        return ds;
    }

    @Bean
    JdbcClient authJdbcClient(@Qualifier("authDataSource") DataSource authDataSource) {
        return JdbcClient.create(authDataSource);
    }
}
