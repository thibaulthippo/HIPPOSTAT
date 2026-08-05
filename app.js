/* HIPPOSTAT — APPLICATION DU PROGRAMME DU JOUR */

/*
     * Modifiez uniquement ce nom lorsque
     * vous changez de fichier quotidien.
     */
    const FICHIER_CSV =
  "./data/programme-du-jour.csv";

  
    const GRAPHIQUE_PLACES = {

    PREMIERE: 1,
    DERNIERE: 7,

    NON_CLASSE: 8,

    DAI: 10

    };


    /*
     * Données chargées depuis le CSV.
     */
    let donneesProgramme = [];
    let lignesCourseCourante = [];

    let chevauxSelectionnes =
     new Set();

    /*
     * Instance Chart.js.
     * Elle doit être détruite avant chaque nouvel affichage.
     */
    Chart.register(
    ChartDataLabels
    );

    let graphiqueGains = null;

    let graphiqueEvolution = null;

   
    /*
     * Palette utilisée pour les participations historiques.
     */
    const couleurs = [
      "rgba(54, 162, 235, 0.75)",
      "rgba(255, 99, 132, 0.75)",
      "rgba(255, 206, 86, 0.75)",
      "rgba(75, 192, 192, 0.75)",
      "rgba(153, 102, 255, 0.75)",
      "rgba(255, 159, 64, 0.75)",
      "rgba(99, 199, 132, 0.75)",
      "rgba(201, 110, 220, 0.75)",
      "rgba(120, 140, 160, 0.75)",
      "rgba(210, 100, 100, 0.75)",
      "rgba(70, 170, 210, 0.75)",
      "rgba(180, 180, 80, 0.75)"
    ];


    document.addEventListener(
      "DOMContentLoaded",
      chargerProgramme
    );

    document
  .getElementById(
    "selectionnerTous"
  )
  .addEventListener(
    "click",
    function() {

      document
        .querySelectorAll(
          "#listeChevaux input[type='checkbox']"
        )
        .forEach(function(caseACocher) {

          caseACocher.checked =
            true;

          chevauxSelectionnes.add(
            caseACocher.value
          );
        });

      mettreAJourGraphiquesSelection();
    }
  );

  document
  .getElementById(
    "deselectionnerTous"
  )
  .addEventListener(
    "click",
    function() {

      document
        .querySelectorAll(
          "#listeChevaux input[type='checkbox']"
        )
        .forEach(function(caseACocher) {

          caseACocher.checked =
            false;
        });

      chevauxSelectionnes.clear();

      mettreAJourGraphiquesSelection();
    }
  );


    /**************************************************
     * CHARGEMENT DU CSV
     **************************************************/
    async function chargerProgramme() {

      try {

        const reponse =
          await fetch(FICHIER_CSV);

        if (!reponse.ok) {

          throw new Error(
            "Impossible de charger le CSV : HTTP " +
            reponse.status
          );
        }

        const texte =
          await reponse.text();

        const resultat =
          Papa.parse(texte, {
            header: true,
            delimiter: ";",
            skipEmptyLines: true,
            transformHeader: function(entete) {

              /*
               * Suppression éventuelle du BOM UTF-8.
               */
              return String(entete || "")
                .replace(/^\uFEFF/, "")
                .trim();
            }
          });

        if (
          resultat.errors &&
          resultat.errors.length > 0
        ) {

          console.warn(
            "Avertissements CSV :",
            resultat.errors
          );
        }

        donneesProgramme =
          resultat.data.filter(function(ligne) {
            

            return (
              ligne.CourseIDProgramme &&
              ligne.Cheval
            );
          });

        if (donneesProgramme.length === 0) {

          throw new Error(
            "Le CSV ne contient aucune donnée exploitable."
          );
        }

        let lignesCourseCourante = [];

        let chevauxSelectionnes =
        new Set();

        remplirListeCourses();

        document
          .getElementById("chargement")
          .classList.add("hidden");

        document
          .getElementById("contenu")
          .classList.remove("hidden");

        const select =
          document.getElementById(
            "selectionCourse"
          );

        select.addEventListener(
          "change",
          function() {

            afficherCourse(
              select.value
            );
          }
        );

        /*
         * Affichage automatique de la première course.
         */
        if (select.options.length > 0) {

          afficherCourse(
            select.value
          );
        }

      } catch (erreur) {

        console.error(erreur);

        document
          .getElementById("chargement")
          .classList.add("hidden");

        const zoneErreur =
          document.getElementById("erreur");

        zoneErreur.textContent =
          erreur.message;

        zoneErreur.classList.remove(
          "hidden"
        );
      }
    }


    /**************************************************
     * LISTE DES COURSES
     **************************************************/
    function remplirListeCourses() {

      const coursesParID =
        new Map();

      donneesProgramme.forEach(
        function(ligne) {

          const courseID =
            nettoyerTexte(
              ligne.CourseIDProgramme
            );

          if (
            !courseID ||
            coursesParID.has(courseID)
          ) {
            return;
          }

          coursesParID.set(
            courseID,
            ligne
          );
        }
      );

      const courses = Array.from(
        coursesParID.entries()
      );

      courses.sort(function(a, b) {

        const ligneA = a[1];
        const ligneB = b[1];

        const reunionA =
          extraireNombre(
            ligneA.Réunion
          );

        const reunionB =
          extraireNombre(
            ligneB.Réunion
          );

        if (reunionA !== reunionB) {
          return reunionA - reunionB;
        }

        const courseA =
          extraireNombre(
            ligneA.Course
          );

        const courseB =
          extraireNombre(
            ligneB.Course
          );

        return courseA - courseB;
      });

      const select =
        document.getElementById(
          "selectionCourse"
        );

      select.innerHTML = "";

      courses.forEach(function(entree) {

        const courseID =
          entree[0];

        const ligne =
          entree[1];

        const option =
          document.createElement(
            "option"
          );

        option.value =
          courseID;

        option.textContent =
          construireLibelleCourse(
            ligne
          );

        select.appendChild(option);
      });
    }


    function construireLibelleCourse(ligne) {

      const morceaux = [
        ligne.Réunion,
        ligne.Course,
        ligne.Heure,
        ligne.Hippodrome
      ]
        .map(nettoyerTexte)
        .filter(Boolean);

      return (
        morceaux.join(" — ") +
        " [" +
        ligne.CourseIDProgramme +
        "]"
      );
    }


    /**************************************************
     * AFFICHAGE D'UNE COURSE
     **************************************************/
    function afficherCourse(
  courseID
) {

  const lignesCourse =
    donneesProgramme.filter(
      function(ligne) {

        return (
          String(
            ligne.CourseIDProgramme || ""
          ).trim() ===
          String(
            courseID || ""
          ).trim()
        );
      }
    );

  if (lignesCourse.length === 0) {
    return;
  }

  /*
   * Informations générales de la course.
   */
  afficherInformationsCourse(
  lignesCourse
  );

  /*
   * Conservation des lignes complètes.
   */
  lignesCourseCourante =
    lignesCourse;

  /*
   * Création de la checklist.
   */
  afficherChecklistChevaux(
    lignesCourseCourante
  );

  /*
   * Création des deux graphiques avec
   * tous les chevaux cochés au départ.
   */
  mettreAJourGraphiquesSelection();
}

    /**************************************************
     * INFORMATIONS DE LA COURSE
     **************************************************/
    function afficherInformationsCourse(
      lignesCourse
    ) {

      const ligne =
        lignesCourse[0];

      const partants =
        obtenirPartantsUniques(
          lignesCourse
        );

      const titre = [
        ligne.Réunion,
        ligne.Course,
        ligne.Hippodrome
      ]
        .map(nettoyerTexte)
        .filter(Boolean)
        .join(" — ");

      const infos = [
        ["Date", ligne.DateProgramme],
        ["Heure", ligne.Heure],
        ["Discipline", ligne.Discipline],
        ["Distance", formaterDistance(
          ligne.DistanceProgramme
        )],
        ["Allocation", formaterEuro(
          ligne.AllocationProgramme
        )],
        ["Partants", partants.length],
        ["Pays", ligne.Pays]
      ];

      const contenuInfos =
        infos
          .filter(function(info) {

            return (
              info[1] !== "" &&
              info[1] !== null &&
              info[1] !== undefined
            );
          })
          .map(function(info) {

            return (
              "<span>" +
              "<strong>" +
              echapperHTML(info[0]) +
              " :</strong> " +
              echapperHTML(info[1]) +
              "</span>"
            );
          })
          .join("");

      document
        .getElementById("courseInfo")
        .innerHTML =
          "<h2>" +
          echapperHTML(titre) +
          "</h2>" +
          '<div class="course-meta">' +
          contenuInfos +
          "</div>";
    }


    /**************************************************
     * GRAPHIQUE DES GAINS
     **************************************************/
    function afficherGraphiqueGains(
      lignesCourse
    ) {

      const partants =
        obtenirPartantsUniques(
          lignesCourse
        );

      let gainMaximum = 0;

      lignesCourse.forEach(function(ligne) {

      const gain =
      convertirNombre(
      ligne.GainEstimé
    );

  if (gain > gainMaximum) {
    gainMaximum = gain;
  }
});

      /*
       * Historique regroupé par partant.
       */
      const historiquesParPartant =
        new Map();

      partants.forEach(function(partant) {

        const cle =
          construireClePartant(
            partant
          );

        historiquesParPartant.set(
          cle,
          []
        );
      });

      lignesCourse.forEach(function(ligne) {

        const cle =
          construireClePartant(
            ligne
          );

        if (
          !historiquesParPartant.has(cle)
        ) {
          historiquesParPartant.set(
            cle,
            []
          );
        }

        /*
         * Une ligne sans CourseIDHistorique
         * correspond à un cheval sans historique.
         */
        if (!ligne.CourseIDHistorique) {
          return;
        }

        historiquesParPartant
          .get(cle)
          .push(ligne);
      });

      /*
       * Tri chronologique de l'historique
       * de chaque cheval.
       */
      historiquesParPartant.forEach(
        function(historique) {

          historique.sort(function(a, b) {

            return nettoyerTexte(
              a.DateHistorique
            ).localeCompare(
              nettoyerTexte(
                b.DateHistorique
              )
            );
          });
        }
      );

      /*
       * Nombre maximum de participations retrouvé
       * parmi les chevaux de la course.
       */
      let nombreMaximumParticipations = 0;

      historiquesParPartant.forEach(
        function(historique) {

          nombreMaximumParticipations =
            Math.max(
              nombreMaximumParticipations,
              historique.length
            );
        }
      );

      const labels =
        partants.map(function(partant) {

          return (
            partant.NuméroProgramme +
            " - " +
            partant.Cheval
          );
        });

      const datasets = [];

      /*
       * Un dataset correspond au rang chronologique
       * de la participation historique.
       *
       * Sortie 1, Sortie 2, Sortie 3...
       */
      for (
        let indexHistorique = 0;
        indexHistorique <
          nombreMaximumParticipations;
        indexHistorique++
      ) {

        const couleur =
          couleurs[
            indexHistorique %
            couleurs.length
          ];

        const donnees =
          new Array(
            partants.length
          ).fill(0);

        const details =
          new Array(
            partants.length
          ).fill(null);

          const couleursBarres =
          new Array(
          partants.length
          ).fill(
          "rgba(210, 210, 210, 0.45)"
          );



        partants.forEach(
          function(partant, indexPartant) {

            const cle =
              construireClePartant(
                partant
              );

            const historique =
              historiquesParPartant.get(
                cle
              ) || [];

            const sortie =
              historique[
                indexHistorique
              ];

            if (!sortie) {
              return;
            }

            donnees[indexPartant] =
              convertirNombre(
                sortie.GainEstimé
              );

            couleursBarres[indexPartant] =
               obtenirCouleurSelonPlace(
              sortie.Place,
              sortie.StatutHistorique
              ); 

            details[indexPartant] = {
              courseID:
                sortie.CourseIDHistorique ||
                "",
              date:
                sortie.DateHistorique ||
                "",
              place:
                sortie.Place ||
                "",
              statut:
                sortie.StatutHistorique ||
                "",
              allocation:
                sortie.AllocationHistorique ||
                "",
              pourcentage:
                sortie.PourcentageAllocation ||
                ""
            };
          }
        );

       datasets.push({

  label:
    "Participation " +
    (indexHistorique + 1),

  data:
    donnees,

  details:
    details,

  backgroundColor:
    couleursBarres,

  /*
   * Sépare clairement deux courses successives,
   * même lorsqu’elles ont la même couleur.
   */
  borderColor:
    "rgba(255, 255, 255, 0.85)",

  borderWidth:
    1.2,

  borderSkipped:
    false
});
      }

      if (graphiqueGains) {
        graphiqueGains.destroy();
        graphiqueGains = null;
      }

      const contexte =
        document
          .getElementById(
            "gainsParCheval"
          )
          .getContext("2d");

      graphiqueGains =
        new Chart(contexte, {

          type: "bar",

          data: {
            labels: labels,
            datasets: datasets
          },

options: {

  responsive: true,

  maintainAspectRatio: false,


  layout: {
  padding: {
  top: 4,
  right: 8,
  bottom: 0,
  left: 0
    }
  },


  interaction: {
    mode: "nearest",
    intersect: true
  },

  plugins: {

    datalabels: {
        display: false
        },


    title: {
      display: true,
      text:
        "Historique des gains",

      color:
        "#f1f5f9",

      font: {
        size: 17,
        weight: "bold"
      },

      padding: {
        top: 8,
        bottom: 14
      }
    },

    legend: {
      display: false
    },

    tooltip: {

      backgroundColor:
        "rgba(15, 23, 42, 0.96)",

      titleColor:
        "#ffffff",

      bodyColor:
        "#e2e8f0",

      borderColor:
        "rgba(255, 255, 255, 0.25)",

      borderWidth:
        1,

      padding:
        12,

      callbacks: {

        title: function(contextes) {

          return contextes.length

            ? contextes[0].label
            : "";
        },

        label: function(contexte) {

          const valeur =
            convertirNombre(
              contexte.raw
            );

          const detail =
            contexte.dataset.details[
              contexte.dataIndex
            ];

          if (!detail) {
            return "";
          }

          return [

            "Course : " +
              detail.courseID,

            "Date : " +
              detail.date,

            "Place : " +
              detail.place,

            "Statut : " +
              detail.statut,

            "Allocation : " +
              formaterEuro(
                detail.allocation
              ),

            "Gain estimé : " +
              formaterEuro(valeur),

            "% allocation : " +
              detail.pourcentage
          ];
        }
      }
    }
  },

  scales: {

   x: {
  stacked: true,

  border: {
    color: "rgba(226, 232, 240, 0.45)"
  },

  grid: {
     color: "rgba(255, 255, 255, 0.06)",
      lineWidth: 1
  },

  title: {
    display: true,
    text: "Partants",
    color: "#d8dee9"
  },

ticks: {
  color: "#d8dee9",
  maxRotation: 42,
  minRotation: 35,
  autoSkip: false,

  font: {
    size: 10
  }
}
},

   y: {
  stacked: true,
  beginAtZero: true,

  border: {
    color: "rgba(226, 232, 240, 0.45)"
  },

  grid: {
    color: "rgba(255, 255, 255, 0.08)"
  },

  title: {
    display: true,
    text: "Gains estimés (€)",
    color: "#d8dee9"
  },

  ticks: {
    color: "#d8dee9",

    callback: function(valeur) {
      return Number(valeur)
        .toLocaleString("fr-FR") + " €";
    }
  }
}
  }
}
        });
    }

    /**************************************************
 * GRAPHIQUE CHRONOLOGIQUE DES PERFORMANCES
 *
 * X : date historique
 * Y : place obtenue
 * Taille : gain estimé
 * Couleur : cheval
 * DAI : ligne spécifique en bas du graphique
 **************************************************/
function afficherGraphiqueEvolution(
  lignesCourse
) {

  const partants =
    obtenirPartantsUniques(
      lignesCourse
    );

   
    /*
   * Gain maximal de toutes les performances
   * de la course sélectionnée.
   * 
   */
let gainMaximum = 0;

lignesCourse.forEach(function(ligne) {

  const gain =
    obtenirGainHistorique(
      ligne
    );

  if (gain > gainMaximum) {
    gainMaximum = gain;
  }
});

if (gainMaximum <= 0) {
  gainMaximum = 1;
}


/*
 * Valeurs utilisées sur l'axe Y
 */
 
  const datasets = [];

  partants.forEach(
    function(partant, indexPartant) {

      const clePartant =
        construireClePartant(
          partant
        );

      const couleurCheval =
        obtenirCouleurCheval(
          indexPartant,
          partants.length
        );

      const points = [];
      const couleursPoints = [];
      const borduresPoints = [];

      lignesCourse.forEach(function(ligne) {

        const statutNormalise =
  normaliserStatutGraphique(
    ligne.StatutHistorique
  );

const estDisqualifie =
  statutNormalise.indexOf("DISQUAL") !== -1 ||
  statutNormalise === "DAI";

const estResultatAbsent =
  statutNormalise === "RESULTAT ABSENT";

const rang =
  extrairePlaceNumerique(
    ligne.Place
  );

const estNonClasse =
rang === 0 &&
!estDisqualifie;

let valeurY;

if (estDisqualifie) {

  valeurY =
    GRAPHIQUE_PLACES.DAI;

} else if (
  estResultatAbsent ||
  estNonClasse
) {

  valeurY =
    GRAPHIQUE_PLACES.NON_CLASSE;

} else {

  valeurY =
    rang;
}


        if (
          construireClePartant(ligne) !==
          clePartant
        ) {
          return;
        }

        if (!ligne.DateHistorique) {
          return;
        }

        const timestamp =
          convertirDateEnTimestamp(
            ligne.DateHistorique
          );

        if (timestamp === null) {
          return;
        }


                /*
         * On conserve :
         * - les résultats classés ;
         * - les disqualifications.
         *
         * Les résultats absents sont ignorés.
         */
        if (
          rang === null &&
          !estDisqualifie
        ) {
          return;
        }

        const gain =
        obtenirGainHistorique(
        ligne
        );

        const rayon =
         estDisqualifie
         ? 5
         : calculerRayonBulle(
        gain,
        gainMaximum
        );

        console.log(
        ligne.Cheval,
        "gain=",
        gain,
        "rayon=",
        rayon
        );
console.log(
  "INFOS HISTORIQUES :",
  ligne.Cheval,
  ligne.HippodromeHistorique,
  ligne.DisciplineHistorique,
  ligne.DistanceHistorique,
  ligne.NombrePartantsHistorique,
  ligne.TempsVainqueur,
  ligne.Temps,
  ligne.RéductionKm
);
points.push({

  x: timestamp,

  y: valeurY,

  r: rayon,

  numero:
    ligne.NuméroProgramme || "",

  cheval:
    ligne.Cheval || "",

  date:
    ligne.DateHistorique || "",

  courseID:
    ligne.CourseIDHistorique || "",

  place:
    ligne.Place || "",

  statut:
    ligne.StatutHistorique || "",

  hippodrome:
    ligne.HippodromeHistorique || "",

  discipline:
    ligne.DisciplineHistorique || "",

  distance:
    ligne.DistanceHistorique || "",

  nombrePartants:
    ligne.NombrePartantsHistorique || "",

  allocation:
    ligne.AllocationHistorique || "",

  gain:
    gain,

  jockey:
    ligne.JockeyHistorique || "",

  tempsVainqueur:
    ligne.TempsVainqueur || "",

  temps:
    ligne.Temps || "",

  reductionKm:
    ligne.RéductionKm ||
    ligne.ReductionKm ||
    "",

  estDisqualifie:
    estDisqualifie,

  estNonClasse:
    estNonClasse
});
        /*
         * Les DAI restent rouges.
         * Les autres points gardent la couleur
         * propre au cheval.
         */
        couleursPoints.push(
          estDisqualifie
            ? "rgba(220, 53, 69, 0.88)"
            : couleurCheval
        );

        borduresPoints.push(
          estDisqualifie
            ? "rgba(255, 150, 160, 1)"
            : "rgba(255, 255, 255, 0.85)"
        );
      });

      if (points.length === 0) {
        return;
      }

      datasets.push({

        label:
          partant.NuméroProgramme +
          " - " +
          partant.Cheval,

        data:
          points,

        backgroundColor:
          couleursPoints,

        borderColor:
          borduresPoints,

        borderWidth:
          1.2,

        hoverBorderWidth:
          2
      });
    }
  );

  if (graphiqueEvolution) {

    graphiqueEvolution.destroy();

    graphiqueEvolution = null;
  }

  const canvas =
    document.getElementById(
      "evolutionPerformances"
    );

  if (!canvas) {

    console.warn(
      "Canvas evolutionPerformances introuvable."
    );

    return;
  }

  const contexte =
    canvas.getContext("2d");

  graphiqueEvolution =
    new Chart(contexte, {

      type: "bubble",

      data: {
        datasets: datasets
      },

      options: {

        responsive: true,

        maintainAspectRatio: false,
     
        interaction: {
          mode: "nearest",
          intersect: true
        },


        plugins: {



           datalabels: {

            display: true,

            formatter: function(value) {

            return value.numero;
            },

            color: "#ffffff",

            font: {

            weight: "bold",

            size: 10
            },

            textStrokeColor: "#000",

            textStrokeWidth: 2
            },

          title: {
            display: true,

            text:
              "Évolution des performances",

            color:
              "#f1f5f9",

            font: {
              size: 17,
              weight: "bold"
            },

            padding: {
              bottom: 16
            }
          },

          /*
           * Avec 15 à 18 chevaux, la légende Chart.js
           * deviendrait trop volumineuse.
           */
          legend: {
            display: false
          },

          tooltip: {

            backgroundColor:
              "rgba(15, 23, 42, 0.97)",

            titleColor:
              "#ffffff",

            bodyColor:
              "#e2e8f0",

            borderColor:
              "rgba(255, 255, 255, 0.25)",

            borderWidth:
              1,

            padding:
              12,

           callbacks: {

title: function(contextes) {

  if (!contextes.length) {
    return "";
  }

  const point =
    contextes[0].raw;

  const numero =
    String(
      point.numero || ""
    ).trim();

  const cheval =
    String(
      point.cheval || ""
    ).trim();

  return (
    "🐎 " +
    [numero, cheval]
      .filter(Boolean)
      .join(" - ")
  );
},

  label: function(contexte) {

    return construireInfobulle(
      contexte.raw
    );
  }
}
          }
        },

        scales: {

          x: {

            type: "linear",

            min:
              obtenirTimestampMinimum(
                datasets
              ),

            max:
              obtenirTimestampMaximum(
                datasets
              ),

            border: {
              color:
                "rgba(226, 232, 240, 0.50)"
            },

            grid: {
              color:
                "rgba(255, 255, 255, 0.06)"
            },

            title: {
              display: true,
              text: "Date",
              color: "#d8dee9"
            },

            ticks: {

              color:
                "#d8dee9",

              maxTicksLimit:
                10,

              callback: function(valeur) {

                return formaterDateTimestamp(
                  Number(valeur)
                );
              }
            }
          },

y: {

  reverse: true,

  min: 0.4,

  max: 10.6,

  ticks: {

    stepSize: 1,

    color: "#d8dee9",

    callback: function(valeur) {

      const nombre =
        Number(valeur);

      if (nombre === GRAPHIQUE_PLACES.NON_CLASSE) {
        return "Non classé";
      }

      if (nombre === GRAPHIQUE_PLACES.DAI) {
        return "DAI";
      }

      if (
        nombre >= 1 &&
        nombre <= 7
      ) {
        return nombre;
      }

      /*
       * La valeur 9 reste volontairement vide.
       */
      return "";
    }
  },

  title: {
    display: true,
    text: "Place",
    color: "#d8dee9"
  }
}
        }
      }
    });
}


    /**************************************************
     * PARTANTS UNIQUES
     **************************************************/
    function obtenirPartantsUniques(
      lignesCourse
    ) {

      const index =
        new Map();

      lignesCourse.forEach(function(ligne) {

        const cle =
          construireClePartant(
            ligne
          );

        if (!index.has(cle)) {
          index.set(cle, ligne);
        }
      });

      const partants =
        Array.from(
          index.values()
        );

      partants.sort(function(a, b) {

        return (
          convertirNombre(
            a.NuméroProgramme
          ) -
          convertirNombre(
            b.NuméroProgramme
          )
        );
      });

      return partants;
    }


    function construireClePartant(ligne) {

      return (
        nettoyerTexte(
          ligne.CourseIDProgramme
        ) +
        "|" +
        nettoyerTexte(
          ligne.NuméroProgramme
        ) +
        "|" +
        nettoyerTexte(
          ligne.Cheval
        ).toUpperCase()
      );
    }


    /**************************************************
     * OUTILS
     **************************************************/
    function nettoyerTexte(valeur) {

      if (
        valeur === null ||
        valeur === undefined
      ) {
        return "";
      }

      return String(valeur).trim();
    }


    function convertirNombre(valeur) {

      if (
        valeur === null ||
        valeur === undefined ||
        valeur === ""
      ) {
        return 0;
      }

      const texte =
        String(valeur)
          .replace(/\u00A0|\u202F/g, "")
          .replace(/[€%]/g, "")
          .replace(/\s/g, "")
          .replace(",", ".")
          .trim();

      const nombre =
        Number(texte);

      return Number.isFinite(nombre)
        ? nombre
        : 0;
    }


    function extraireNombre(valeur) {

      const correspondance =
        String(valeur || "")
          .match(/\d+/);

      return correspondance
        ? Number(correspondance[0])
        : 0;
    }


    function formaterEuro(valeur) {

      const nombre =
        convertirNombre(valeur);

      if (!nombre) {

        const texte =
          nettoyerTexte(valeur);

        return texte || "0 €";
      }

      return nombre.toLocaleString(
        "fr-FR",
        {
          maximumFractionDigits: 0
        }
      ) + " €";
    }


    function formaterDistance(valeur) {

      const texte =
        nettoyerTexte(valeur);

      if (!texte) {
        return "";
      }

      if (/m$/i.test(texte)) {
        return texte;
      }

      return texte + " m";
    }


    function echapperHTML(valeur) {

      return String(
        valeur === null ||
        valeur === undefined
          ? ""
          : valeur
      )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

   function obtenirCouleurSelonPlace(
  place,
  statut
) {

  const statutNormalise =
    String(statut || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

 



  const correspondance =
    String(place || "")
      .match(/\d+/);

  const rang =
    correspondance
      ? Number(correspondance[0])
      : 0;

  if (rang === 1) {
    return "rgba(34, 139, 34, 0.85)";
  }

  if (rang === 2) {
    return "rgba(76, 175, 80, 0.75)";
  }

  if (rang === 3) {
    return "rgba(129, 199, 132, 0.65)";
  }

  if (
    rang === 4 ||
    rang === 5
  ) {
    return "rgba(100, 181, 246, 0.70)";
  }

  if (rang >= 6) {
    return "rgba(180, 180, 180, 0.70)";
  }

  return "rgba(210, 210, 210, 0.45)";
}
/**************************************************
 * PLACE NUMÉRIQUE
 **************************************************/
function extrairePlaceNumerique(place) {

  const correspondance =
    String(place || "")
      .match(/\d+/);

  if (!correspondance) {
    return null;
  }

  const rang =
    Number(
      correspondance[0]
    );

  return Number.isFinite(rang)
    ? rang
    : null;
}


/**************************************************
 * NORMALISATION DU STATUT
 **************************************************/
function normaliserStatutGraphique(statut) {

  return String(statut || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}


/**************************************************
 * DATE CSV VERS TIMESTAMP
 **************************************************/
function convertirDateEnTimestamp(dateTexte) {

  const texte =
    String(dateTexte || "")
      .trim();

  if (!texte) {
    return null;
  }

  /*
   * Format YYYY-MM-DD.
   */
  let correspondance =
    texte.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (correspondance) {

    return new Date(
      Number(correspondance[1]),
      Number(correspondance[2]) - 1,
      Number(correspondance[3])
    ).getTime();
  }

  /*
   * Format DD/MM/YYYY.
   */
  correspondance =
    texte.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

  if (correspondance) {

    return new Date(
      Number(correspondance[3]),
      Number(correspondance[2]) - 1,
      Number(correspondance[1])
    ).getTime();
  }

  const date =
    new Date(texte);

  const timestamp =
    date.getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : null;
}


/**************************************************
 * FORMATAGE DATE DE L'AXE
 **************************************************/
function formaterDateTimestamp(timestamp) {

  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleDateString(
    "fr-FR",
    {
      month: "short",
      year: "2-digit"
    }
  );
}


/**************************************************
 * TAILLE DES BULLES
 **************************************************/
function calculerRayonBulle(
  gain,
  gainMaximum
) {

  const montant =
    Math.max(
      0,
      convertirNombre(gain)
    );

  const maximum =
    Math.max(
      1,
      convertirNombre(gainMaximum)
    );

  if (montant <= 0) {
    return 4;
  }

  /*
   * La surface de la bulle suit approximativement
   * l'importance du gain.
   */
  const proportion =
    Math.sqrt(
      montant / maximum
    );

  const rayonMinimum = 4;
  const rayonMaximum = 20;

  return (
    rayonMinimum +
    proportion *
    (
      rayonMaximum -
      rayonMinimum
    )
  );
}


/**************************************************
 * COULEUR PROPRE À CHAQUE CHEVAL
 **************************************************/
function obtenirCouleurCheval(
  index,
  total
) {

  const nombre =
    Math.max(
      1,
      total
    );

  const teinte =
    Math.round(
      index *
      360 /
      nombre
    );

  return (
    "hsla(" +
    teinte +
    ", 68%, 56%, 0.62)"
  );
}


/**************************************************
 * BORNES CHRONOLOGIQUES
 **************************************************/
function obtenirTimestampMinimum(
  datasets
) {

  const valeurs = [];

  datasets.forEach(function(dataset) {

    dataset.data.forEach(function(point) {

      if (
        Number.isFinite(point.x)
      ) {
        valeurs.push(point.x);
      }
    });
  });

  if (valeurs.length === 0) {
    return undefined;
  }

  const minimum =
    Math.min.apply(
      null,
      valeurs
    );

  /*
   * Marge de 15 jours à gauche.
   */
  return minimum -
    15 * 24 * 60 * 60 * 1000;
}


function obtenirTimestampMaximum(
  datasets
) {

  const valeurs = [];

  datasets.forEach(function(dataset) {

    dataset.data.forEach(function(point) {

      if (
        Number.isFinite(point.x)
      ) {
        valeurs.push(point.x);
      }
    });
  });

  if (valeurs.length === 0) {
    return undefined;
  }

  const maximum =
    Math.max.apply(
      null,
      valeurs
    );

  /*
   * Marge de 15 jours à droite.
   */
  return maximum +
    15 * 24 * 60 * 60 * 1000;
}

/**************************************************
 * RÉCUPÈRE LE GAIN HISTORIQUE
 **************************************************/
function obtenirGainHistorique(ligne) {

  if (!ligne) {
    return 0;
  }

  const valeursPossibles = [

    ligne.GainEstimé,

    ligne.GainEstime,

    ligne.GainEstiméAllocationHistorique,

    ligne.GainEstimeAllocationHistorique,

    ligne["Gain estimé"],

    ligne["Gain historique"]
  ];

  for (
    let i = 0;
    i < valeursPossibles.length;
    i++
  ) {

    const valeur =
      convertirNombre(
        valeursPossibles[i]
      );

    if (valeur > 0) {
      return valeur;
    }
  }

  return 0;
}

function obtenirJockeyHistorique(ligne) {

  if (!ligne) {
    return "";
  }

  const valeursPossibles = [

    ligne.JockeyHistorique,

    ligne["JockeyHistorique"],

    ligne["Jockey / Driver"],

    ligne.Jockey,

    ligne.Driver,

    ligne.driver
  ];

  for (
    let i = 0;
    i < valeursPossibles.length;
    i++
  ) {

    const valeur =
      String(
        valeursPossibles[i] || ""
      ).trim();

    if (valeur !== "") {
      return valeur;
    }
  }

  return "";
}

function afficherChecklistChevaux(
  lignesCourse
) {

  const conteneur =
    document.getElementById(
      "listeChevaux"
    );

  if (!conteneur) {
    return;
  }

  conteneur.innerHTML = "";

  const partants =
    obtenirPartantsUniques(
      lignesCourse
    );

  chevauxSelectionnes =
    new Set();

  partants.forEach(function(partant) {

    const cle =
      construireClePartant(
        partant
      );

    chevauxSelectionnes.add(cle);

    const bloc =
      document.createElement("div");

    bloc.className =
      "cheval-checkbox";

    const input =
      document.createElement("input");

    input.type =
      "checkbox";

    input.checked =
      true;

    input.id =
      "cheval_" +
      cle.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      );

    input.dataset.cle =
      cle;

    const label =
      document.createElement("label");

    label.htmlFor =
      input.id;

    label.textContent =
      (
        partant.NuméroProgramme ||
        ""
      ) +
      " - " +
      (
        partant.Cheval ||
        ""
      );

    input.addEventListener(
      "change",
      function() {

        if (input.checked) {

          chevauxSelectionnes.add(
            cle
          );

        } else {

          chevauxSelectionnes.delete(
            cle
          );
        }

        rafraichirGraphiquesSelection(
          lignesCourse
        );
      }
    );

    bloc.appendChild(input);
    bloc.appendChild(label);

    conteneur.appendChild(bloc);
  });
}

function filtrerLignesParSelection(
  lignesCourse
) {

  return lignesCourse.filter(
    function(ligne) {

      const cle =
        construireClePartant(
          ligne
        );

      return chevauxSelectionnes.has(
        cle
      );
    }
  );
}

function rafraichirGraphiquesSelection(
  lignesCourse
) {

  const lignesFiltrees =
    filtrerLignesParSelection(
      lignesCourse
    );

  afficherGraphiqueGains(
    lignesFiltrees
  );

  afficherGraphiqueEvolution(
    lignesFiltrees
  );
}

function formaterResultatHistorique(ligne) {

  const statut =
    normaliserStatutGraphique(
      ligne.StatutHistorique
    );

  const place =
    String(
      ligne.Place || ""
    ).trim();

  if (
    statut.includes("DISQUAL") ||
    statut === "DAI"
  ) {
    return "🔴 DAI";
  }

  if (
    statut === "NON CLASSE" ||
    statut === "NON CLASSEMENT"
  ) {
    return "⚪ Non classé";
  }

  if (
    statut === "NP" ||
    statut === "NON PARTANT"
  ) {
    return "⛔ Non-partant";
  }

  if (
    statut === "RESULTAT ABSENT"
  ) {
    return "⚫ Résultat absent";
  }

  if (place) {
    return "Résultat : " + place;
  }

  return "Résultat non renseigné";
}

function libelleResultat(ligne) {

  const statut =
    normaliserStatutGraphique(
      ligne.StatutHistorique
    );

  if (statut === "DISQUALIFIE") {
    return "DAI";
  }

  if (statut === "RESULTAT ABSENT") {
    return "Non classé";
  }

  return ligne.Place;
}

function construireInfobulle(point) {

  const lignes = [];

  /*
   * Date + code de la course.
   *
   * R4C1_2026-02-26 devient R4C1,
   * puisque la date est déjà affichée.
   */
  const date =
    formaterDateInfobulle(
      point.date
    );

  const codeCourse =
    extraireCodeCourseInfobulle(
      point.courseID
    );

  const dateCourse =
    [date, codeCourse]
      .filter(function(valeur) {
        return String(valeur || "").trim();
      })
      .join(" • ");

  ajouterLigneInfobulle(
    lignes,
    "📅 ",
    dateCourse
  );

  ajouterLigneInfobulle(
    lignes,
    "📍 ",
    point.hippodrome
  );

  /*
   * Séparation visuelle.
   */
  ajouterSeparateurInfobulle(
    lignes
  );

  /*
   * Discipline et distance sur une seule ligne.
   */
  const disciplineDistance =
    [
      point.discipline,
      formaterDistanceInfobulle(
        point.distance
      )
    ]
    .filter(function(valeur) {
      return String(valeur || "").trim();
    })
    .join(" • ");

  ajouterLigneInfobulle(
    lignes,
    "🏇 ",
    disciplineDistance
  );

  ajouterLigneInfobulle(
    lignes,
    "👥 ",
    point.nombrePartants
      ? point.nombrePartants +
        " partants"
      : ""
  );

  ajouterSeparateurInfobulle(
    lignes
  );

  /*
   * Résultat :
   * - place réelle ;
   * - DAI ;
   * - Non classé ;
   * - Non-partant.
   */
  ajouterLigneInfobulle(
    lignes,
    "🏁 ",
    formaterResultatPoint(
      point
    )
  );

  ajouterSeparateurInfobulle(
    lignes
  );

  ajouterLigneInfobulle(
    lignes,
    "💰 Gain estimé : ",
    formaterEuro(
      point.gain
    )
  );

  ajouterLigneInfobulle(
    lignes,
    "🏆 Allocation : ",
    formaterEuro(
      point.allocation
    )
  );

  ajouterSeparateurInfobulle(
    lignes
  );

  ajouterLigneInfobulle(
    lignes,
    "👤 ",
    point.jockey
  );

  /*
   * La séparation suivante n’est ajoutée
   * que si au moins un chrono existe.
   */
  const aUnChrono =
    [
      point.tempsVainqueur,
      point.temps,
      point.reductionKm
    ]
    .some(function(valeur) {
      return String(
        valeur || ""
      ).trim() !== "";
    });

  if (aUnChrono) {

    ajouterSeparateurInfobulle(
      lignes
    );
  }

  ajouterLigneInfobulle(
    lignes,
    "⏱ Temps vainqueur : ",
    point.tempsVainqueur
  );

  ajouterLigneInfobulle(
    lignes,
    "⏱ Temps : ",
    point.temps
  );

  ajouterLigneInfobulle(
    lignes,
    "⚡ Réduction km : ",
    point.reductionKm
  );

  return lignes;
}

function ajouterLigneInfobulle(
  lignes,
  libelle,
  valeur
) {

  if (
    valeur === null ||
    valeur === undefined
  ) {
    return;
  }

  const texte =
    String(valeur).trim();

  if (!texte) {
    return;
  }

  lignes.push(
    libelle + texte
  );
}

function formaterResultatPoint(point) {

  const statut =
    normaliserStatutGraphique(
      point.statut
    );

  if (
    statut.includes("DISQUAL") ||
    statut === "DAI"
  ) {
    return "DAI";
  }

  if (
    statut === "RESULTAT ABSENT"
  ) {
    return "Non classé";
  }

  if (
    statut === "NP" ||
    statut === "NON PARTANT"
  ) {
    return "Non-partant";
  }

  return String(
    point.place || ""
  ).trim();
}

function ajouterSeparateurInfobulle(
  lignes
) {

  /*
   * Chart.js accepte une chaîne vide pour
   * créer un léger espace vertical.
   *
   * On évite deux séparateurs consécutifs.
   */
  if (
    lignes.length > 0 &&
    lignes[lignes.length - 1] !== ""
  ) {
    lignes.push("");
  }
}

function formaterDateInfobulle(
  dateTexte
) {

  const texte =
    String(dateTexte || "").trim();

  const correspondance =
    texte.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!correspondance) {
    return texte;
  }

  return (
    correspondance[3] +
    "/" +
    correspondance[2] +
    "/" +
    correspondance[1]
  );
}

function extraireCodeCourseInfobulle(
  courseID
) {

  const texte =
    String(courseID || "").trim();

  if (!texte) {
    return "";
  }

  /*
   * R4C1_2026-02-26 → R4C1
   */
  return texte.split("_")[0];
}

function formaterDistanceInfobulle(
  distance
) {

  const texte =
    String(distance || "").trim();

  if (!texte) {
    return "";
  }

  /*
   * Évite 2850m et affiche 2850 m.
   */
  return texte.replace(
    /(\d)\s*m$/i,
    "$1 m"
  );
}

function afficherChecklistChevaux(
  lignesCourse
) {

  const section =
    document.getElementById(
      "selectionChevaux"
    );

  const conteneur =
    document.getElementById(
      "listeChevaux"
    );

  conteneur.innerHTML = "";

  const chevauxParCle =
    new Map();

  lignesCourse.forEach(function(ligne) {

    const cheval =
      String(
        ligne.Cheval || ""
      ).trim();

    if (!cheval) {
      return;
    }

    const numero =
      String(
        ligne.NuméroProgramme ||
        ligne.NumeroProgramme ||
        ""
      ).trim();

    const cle =
      normaliserCleChevalInterface(
        cheval
      );

    if (!chevauxParCle.has(cle)) {

      chevauxParCle.set(cle, {
        cle: cle,
        numero: numero,
        cheval: cheval
      });
    }
  });

  const chevaux =
    Array.from(
      chevauxParCle.values()
    );

  chevaux.sort(function(a, b) {

    const numeroA =
      Number(a.numero);

    const numeroB =
      Number(b.numero);

    if (
      Number.isFinite(numeroA) &&
      Number.isFinite(numeroB)
    ) {
      return numeroA - numeroB;
    }

    return a.cheval.localeCompare(
      b.cheval,
      "fr"
    );
  });

  chevauxSelectionnes =
    new Set(
      chevaux.map(function(cheval) {
        return cheval.cle;
      })
    );

  chevaux.forEach(function(cheval) {

    const label =
      document.createElement(
        "label"
      );

    label.className =
      "choix-cheval";

    const caseACocher =
      document.createElement(
        "input"
      );

    caseACocher.type =
      "checkbox";

    caseACocher.checked =
      true;

    caseACocher.value =
      cheval.cle;

    caseACocher.dataset.cheval =
      cheval.cheval;

    caseACocher.addEventListener(
      "change",
      gererChangementSelectionCheval
    );

    const numero =
      document.createElement(
        "span"
      );

    numero.className =
      "choix-cheval-numero";

    numero.textContent =
      cheval.numero || "–";

    const nom =
      document.createElement(
        "span"
      );

    nom.className =
      "choix-cheval-nom";

    nom.textContent =
      cheval.cheval;

    nom.title =
      cheval.cheval;

    label.appendChild(
      caseACocher
    );

    label.appendChild(
      numero
    );

    label.appendChild(
      nom
    );

    conteneur.appendChild(
      label
    );
  });

  section.classList.remove(
    "hidden"
  );
}

function normaliserCleChevalInterface(
  cheval
) {

  return String(cheval || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    );
}

function gererChangementSelectionCheval(
  evenement
) {

  const caseACocher =
    evenement.target;

  const cleCheval =
    caseACocher.value;

  if (caseACocher.checked) {

    chevauxSelectionnes.add(
      cleCheval
    );

  } else {

    chevauxSelectionnes.delete(
      cleCheval
    );
  }

  mettreAJourGraphiquesSelection();
}
function obtenirLignesChevauxSelectionnes() {

  return lignesCourseCourante.filter(
    function(ligne) {

      const cleCheval =
        normaliserCleChevalInterface(
          ligne.Cheval
        );

      return chevauxSelectionnes.has(
        cleCheval
      );
    }
  );
}

function mettreAJourGraphiquesSelection() {

  const lignesFiltrees =
    obtenirLignesChevauxSelectionnes();

  /*
   * Utilisez ici les noms exacts de vos
   * fonctions actuelles.
   */
  afficherGraphiqueGains(
    lignesFiltrees
  );

  afficherGraphiqueEvolution(
    lignesFiltrees
  );
}