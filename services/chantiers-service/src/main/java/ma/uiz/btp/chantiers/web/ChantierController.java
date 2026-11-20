package ma.uiz.btp.chantiers.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
    @Operation(summary = "Créer un chantier", description = "Le chantier est toujours créé au statut PLANIFIE (RG4) : le champ statut est ignoré.")
    public ResponseEntity<ChantierDto.Reponse> creer(@Valid @RequestBody ChantierDto.Requete requete) {
        var cree = ChantierDto.Reponse.de(service.creer(requete));
        var location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(cree.id()).toUri();
        return ResponseEntity.created(location).body(cree);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier un chantier (interdit s'il est terminé)",
            description = "Le statut peut passer à PLANIFIE, EN_COURS ou SUSPENDU. Le passage à TERMINE est refusé (409) : "
                    + "utiliser PATCH /api/chantiers/{id}/cloture.")
    public ChantierDto.Reponse modifier(@PathVariable Long id, @Valid @RequestBody ChantierDto.Requete requete) {
        return ChantierDto.Reponse.de(service.modifier(id, requete));
    }

    @PatchMapping("/{id}/cloture")
    @Operation(summary = "Clôturer un chantier")
    public ChantierDto.Reponse cloturer(@PathVariable Long id) {
        return ChantierDto.Reponse.de(service.cloturer(id));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un chantier (refusé s'il a des tâches)",
            description = "Interroge le module Tâches (GET /api/taches?chantierId=). Toute "
                    + "tâche du chantier, terminée comprise, bloque la suppression (409, tâches "
                    + "citées). Un 404 de Tâches vaut « aucune tâche ». Si Tâches ne répond pas, "
                    + "rien n'est supprimé (503).")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Chantier supprimé"),
            @ApiResponse(responseCode = "404", description = "Chantier introuvable"),
            @ApiResponse(responseCode = "409", description = "Le chantier a des tâches"),
            @ApiResponse(responseCode = "503",
                    description = "Module Tâches injoignable : suppression annulée")
    })
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
