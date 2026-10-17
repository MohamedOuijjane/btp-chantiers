package ma.uiz.btp.chantiers;

import ma.uiz.btp.chantiers.client.TachesClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ChantierControllerTest {

    @Autowired MockMvc mvc;
    @MockBean TachesClient tachesClient;

    private static final String CHANTIER = """
            {"nom":"Résidence Al Amal","adresse":"Hay Mohammadi, Agadir","client":"Société Souss Immo",
             "dateDebut":"2026-11-01","dateFinPrevue":"2027-06-30","budget":2500000}
            """;

    private String creer() throws Exception {
        String location = mvc.perform(post("/api/chantiers").contentType(MediaType.APPLICATION_JSON).content(CHANTIER))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.statut").value("PLANIFIE"))
                .andReturn().getResponse().getHeader("Location");
        return location.substring(location.lastIndexOf('/') + 1);
    }

    @Test
    void creerPuisConsulter() throws Exception {
        String id = creer();
        mvc.perform(get("/api/chantiers/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nom").value("Résidence Al Amal"));
    }

    @Test
    void refuseUnePeriodeIncoherente() throws Exception {
        String invalide = CHANTIER.replace("2027-06-30", "2026-01-01");
        mvc.perform(post("/api/chantiers").contentType(MediaType.APPLICATION_JSON).content(invalide))
                .andExpect(status().isBadRequest());
    }

    @Test
    void chantierTermineNonModifiable() throws Exception {
        String id = creer();
        mvc.perform(patch("/api/chantiers/" + id + "/cloture")).andExpect(jsonPath("$.statut").value("TERMINE"));
        mvc.perform(put("/api/chantiers/" + id).contentType(MediaType.APPLICATION_JSON).content(CHANTIER))
                .andExpect(status().isConflict());
    }

    @Test
    void chantierInexistantRenvoie404() throws Exception {
        mvc.perform(get("/api/chantiers/99999")).andExpect(status().isNotFound());
    }

    @Test
    void avancementCalculeDepuisLesTaches() throws Exception {
        when(tachesClient.tachesDuChantier(anyLong())).thenReturn(Optional.of(List.of(
                new TachesClient.TacheResume("a", "Fondations", "TERMINEE", 100),
                new TachesClient.TacheResume("b", "Gros oeuvre", "EN_COURS", 40))));
        String id = creer();
        mvc.perform(get("/api/chantiers/" + id + "/avancement"))
                .andExpect(jsonPath("$.nombreTaches").value(2))
                .andExpect(jsonPath("$.avancementGlobal").value(70.0))
                .andExpect(jsonPath("$.sourceDisponible").value(true));
    }

    @Test
    void avancementDegradeSiTachesIndisponible() throws Exception {
        when(tachesClient.tachesDuChantier(anyLong())).thenReturn(Optional.empty());
        String id = creer();
        mvc.perform(get("/api/chantiers/" + id + "/avancement"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceDisponible").value(false));
    }
}
