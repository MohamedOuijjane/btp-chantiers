package ma.uiz.btp.materiaux;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Point d'entrée du module Matériaux (Spring Boot, web service SOAP). */
@SpringBootApplication
public class MateriauxApplication {
    /** Démarre le service Matériaux. */
    public static void main(String[] args) {
        SpringApplication.run(MateriauxApplication.class, args);
    }
}
