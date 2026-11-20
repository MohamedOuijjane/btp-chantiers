package ma.uiz.btp.chantiers;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Point d'entrée du module Chantiers (Spring Boot). */
@SpringBootApplication
public class ChantiersApplication {
    /** Démarre le service Chantiers. */
    public static void main(String[] args) {
        SpringApplication.run(ChantiersApplication.class, args);
    }
}
