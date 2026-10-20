# Juridisk och datamässig kontroll – arbetsrapport 0.2.0

## Kontrollerade primärkällor

- SFS 2022:629, aktuell publicerad konsoliderad lagtext, §§ 1–22: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-2022629-om-proportionella-val-i-kommuner_sfs-2022-629/
- Kommunallagen 2017:725: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/kommunallag-2017725_sfs-2017-725/
- Lekebergs kommun, allmänt reglemente fastställt 2025-03-03, avsnitt 1.1 och 1.12 (historisk version).
- Kommunstyrelsen 2026-04-07 § 70, KS 25-813 (förslag om ny bygg- och miljönämnd, 5 ledamöter + 3 ersättare, från 2027-01-01): https://meetings.lekeberg.se/committees/kommunstyrelsen/mote-2026-04-07
- Kommunfullmäktige 2026-04-27, punkt 26, reglemente för bygg- och miljönämnden: https://meetings.lekeberg.se/committees/kommunfullmaktige/mote-2026-04-27

## Rättsligt kontrollerade beräkningsprinciper, men inte verifierat produktionssystem

- § 2 anger tröskel för att begära proportionellt val utifrån närvarande väljande och antal personer som valet avser.
- § 3 begränsar proportionella ersättarval.
- §§ 9–10 reglerar ogiltiga valsedlar och namn som ska lämnas utan avseende.
- § 14 definierar valsedelsgrupper efter gruppbeteckning och identisk namnordning.
- §§ 16–20 reglerar fördelning/besättande; i 18 § delar tilldelning av samma person från flera grupper nämnaren med exakt 1/k per grupp.
- § 21 föreskriver lottning vid lika röstetal/jämförelsetal. **Simulerade sannolikheter förutsätter likformig lottning.**
- § 22 reglerar ersättarnas inträdesordning vid proportionellt val, men ett fullt granskat personbaserat användargränssnitt har ännu inte byggts.

## Lokalt platsantal – viktigt att skilja från totalt antal

2025 års reglemente 1.1, s. 4 uppger bland annat Lekebergs representation:

| Organ | Lekebergs ledamöter | Lekebergs ersättare | Dokumentstatus |
|---|---:|---:|---|
| Kommunstyrelsen | 13 | 6 | Historiskt reglemente |
| Barn- och utbildningsnämnden | 9 | 5 | Historiskt reglemente |
| Socialnämnden | 9 | 5 | Historiskt reglemente |
| Valnämnden | 5 | 5 | Historiskt reglemente |
| Krisledningsnämnden | 5 | 5 | Historiskt reglemente |
| Sydnärkes IT-nämnd | 1 | 1 | Historiskt reglemente |
| Sydnärkes miljö- och byggnämnd | 3 | 3 | Historiskt reglemente, ändring planerad |
| Sydnärkes lönenämnd | 1 | 1 | Historiskt reglemente |
| Taxe- och avgiftsnämnden | 1 | 1 | Historiskt reglemente |
| Sydnärkes överförmyndarnämnd | 1 | 1 | Historiskt reglemente |

**Sydnärkes IT-nämnd:** Värdet 4+4 i importerad uppdragsfil får inte tolkas som fyra platser som Lekeberg själv kan fördela. 2025 års reglemente anger 1+1 för Lekeberg.

**Bygg- och miljönämnden:** KS 2026-04-07 föreslog 5+3 från 2027-01-01. KF behandlade frågan 2026-04-27, men det slutliga justerade protokollbeslutet är inte verifierat i denna leverans. Status: **förslag, inväntar beslutsverifiering**.

## Ej verifierat

- Att samtliga 57 poster i det importerade Excel-underlaget kan tillsättas enligt samma matematiska metod (det kan de inte antas göra).
- Samtliga bolags bolagsordningar, gemensamma nämnders särskilda reglementen, föreningar och enskilda representanters tillsättningsregler.
- Fullständigt kandidatvaliderad tillämpning av svårtolkade namnlistor, formalia kring valet eller samtliga möjliga fall av flera gruppbeteckningar.
- Egen fristående rättslig granskning av samtliga testfall av kommunjurist eller valförrättare.
- Slutligt protokollstöd för uppdragsförteckningen 2026–2030 och Valmyndighetens slutliga Lekebergsmandat på individnivå.

**Slutsats:** Portalen är ett simuleringsverktyg med bättre underbyggd kandidatmotor och källstatus, inte en rättsligt certifierad valförrättare.
