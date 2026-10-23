# Integritet, ansvar och kontrollpunkter

**Inte en publiceringsklar integritetspolicy.** Vissa viktiga uppgifter kan endast verksamhetsansvarig fylla i: vem som är personuppgiftsansvarig, kontaktväg, ändamål, rättslig grund, eventuellt personuppgiftsbiträdesavtal och retention för Cloudflares egna loggar.

| Data | Standardläge | Lagring i portalens databas | Åtkomst |
|---|---|---|---|
| Scenarier och kandidatlistor | Lokalt i webbläsaren | Ingen | Besökarens enhet |
| Frivilligt delad kartellindelning | Avstängd på servern | Datum, normaliserad kartellindelning, summerat antal; 90 dagar | Skyddad admin, minst fem observationer per kartellindelning visas |
| IP-baserade säkerhetshändelser | Avstängd | Endast nekade adminanrop: IP, exakt tid, HTTP-status; sju dagar | Behörig admin |
| Cloudflares nätverkstrafik | Enligt Cloudflares och kontots konfiguration | Hanteras av Cloudflare, utanför denna applikations databas | Enligt Cloudflare-kontots inställningar |

## Att besluta före eventuell aktivering

1. Ange personuppgiftsansvarig och kontaktuppgifter i en verklig integritetspolicy.
2. Dokumentera ändamål och rättslig grund för varje datakategori. IP-adresser är personuppgifter; politiska kombinationer kan medföra särskilda integritetsrisker.
3. Kontrollera Cloudflares egen tekniska loggning och eventuella databehandlingsavtal.
4. Bedöm om frivilligt delad kartellstatistik behöver samtycke enligt GDPR och/eller regler om lagring/åtkomst på användarens utrustning.
5. Bedöm om statistik kan kombineras eller indirekt knytas till en identifierbar besökare. Undvik att samla in analysdata utan tydlig frivillig handling.
6. Kontrollera teknisk säkerhet, åtkomstpolicy, rensning, incidenthantering och möjligheten att tillgodose registrerades rättigheter.
7. Utvärdera om konsekvensbedömning enligt GDPR artikel 35 är nödvändig för de avsedda behandlingarna.

En offentlig portal kan innebära särskilt skyddsvärda politiska intressen. Separata databastabeller är inte ensamma ett absolut anonymitetsskydd. I denna implementation sammanförs de inte, och kartellanalys skickas aldrig automatiskt.

Den säkraste driftsättningen är att **inte slå på insamlingen** förrän en skriftlig integritetsbedömning är färdig. Alla publika beräkningsfunktioner fungerar även när insamlingen är avstängd.

## Säkerhetstest som krävs i verklig miljö

- Verifiera Cloudflare Access policy för båda admin-URL:erna med egen och obehörig inloggning.
- Kontrollera att Worker-servicen faktiskt verifierar signerad Access JWT vid varje anrop.
- Kontrollera att `dist/index.html` inte innehåller admin-token, lösenord eller databasuppgifter.
- Bekräfta D1-migrering på rätt databas.
- Aktivera temporärt testläge med testdata och kontrollera att aggregation samt automatisk gallring fungerar i Cloudflare-miljö innan drift.
- Använd rate limiting/WAF mot manipulation eller överbelastning av statistikendpointen om insamling aktiveras.

## Checklista för skyddad Arbetsyta (tillägg 1.7.1)

Arbetsytan lagrar också uppgifter om inloggade gruppmedlemmar, interna motioner och andra skrivelser, ärenden, kommentarer, sammanträdesförberedelser, uppföljningar, bifogade filer och personliga anteckningar. Personuppgifter och uppgifter som avslöjar politiska åsikter kan förekomma i detta material. Den befintliga tabellen ovan beskriver i första hand den publika portalens statistik och är **inte** en komplett förteckning över behandlingar i Arbetsytan.

Innan gruppen använder funktionerna med faktiska uppgifter ska ansvarig dokumentera vem som är personuppgiftsansvarig, ändamål och rättslig grund för Arbetsytans datakategorier, åtkomst och delningsrutiner, lagring/gallring, incidenthantering, biträden samt eventuell konsekvensbedömning. Kontrollera dessa frågor med kompetent dataskyddsansvarig. Ingen policy kan anses fastställd genom en ändring i källkoden.

Varken integration med en annan organisations databas, export av privata ärenden eller ändrade behörigheter ingår i 1.7.1.
