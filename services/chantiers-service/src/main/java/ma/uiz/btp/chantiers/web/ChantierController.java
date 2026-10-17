package ma.uiz.btp.chantiers.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import ma.uiz.btp.chantiers.domain.StatutChantier;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.List;

@RestController
@RequestMapping("/api/chantiers")
@Tag(name = "Chantiers", description = "Gestion du cycle de vie des chantiers")
public class ChantierController {

    private final ChantierService service;

    public ChantierController(ChantierService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lister les chantiers, filtrables par statut")
    public List<ChantierDto.Reponse> lister(@RequestParam(required = false) StatutChantier statut) {
        return service.lister(statut).stream().map(ChantierDto.Reponse::de).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consulter un chantier")
    public ChantierDto.Reponse trouver(@PathVariable Long id) {
        return ChantierDto.Reponse.de(service.trouver(id));
    }

    @PostMapping
    @Operation(summary = "Créer un chantier")
    public ResponseEntity<ChantierDto.Reponse> creer(@Valid @RequestBody ChantierDto.Requete requete) {
        var cree = ChantierDto.Reponse.de(service.creer(requete));
        var location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(cree.id()).toUri();
        return ResponseEntity.created(location).body(cree);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier un chantier (interdit s'il est terminé)")
    public ChantierDto.Reponse modifier(@PathVariable Long id, @Valid @RequestBody ChantierDto.Requete requete) {
        return ChantierDto.Reponse.de(service.modifier(id, requete));
    }

    @PatchMapping("/{id}/cloture")
    @Operation(summary = "Clôturer un chantier")
    public ChantierDto.Reponse cloturer(@PathVariable Long id) {
        return ChantierDto.Reponse.de(service.cloturer(id));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un chantier")
    public ResponseEntity<Void> supprimer(@PathVariable Long id) {
        service.supprimer(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/avancement")
    @Operation(summary = "Avancement global, agrégé depuis le module Tâches")
    public ChantierDto.Avancement avancement(@PathVariable Long id) {
        return service.avancement(id);
    }
}
