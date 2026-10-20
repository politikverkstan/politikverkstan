# Säkerhet, integritet och kända begränsningar

## Behörighetsmodell

Cloudflare Access tillhandahåller signerad autentisering. Workern kontrollerar JWT-signatur, issuer, audience och giltighetstid och läser endast användaridentitet från en verifierad token. Databasen kontrollerar separat rollen `admin` eller `user` samt att kontot är aktivt. Endast ägaren kan läsa, uppdatera, återställa eller ta bort en privat motion. Inte ens administratören får generell åtkomst till andras utkast.

Privata HTML- och API-rutter returnerar `no-store` och nekas som standard om Access/D1-konfiguration saknas eller är felaktig. Arbetsrummets JS och CSS genereras inuti Workern, inte som publika filer i `dist`.

## Sekretess och personuppgifter

Privata utkast kan innehålla namn, politiska uppfattningar och arbetsmaterial. Driftansvarig måste före lansering dokumentera personuppgiftsansvar, syften, rättslig grund, lagring och radering, biträden och hur rättigheter tillgodoses. Använd inte verkliga sekretessbelagda personuppgifter i motioner.

Befintlig aggregerad kartellstatistik är frivillig och är avstängd som standard. Säkerhetsloggning med IP är också avstängd som standard. Ingen privat motionstext skickas till publik användningsstatistik. Ingen extern AI-tjänst kontaktas.

## Funktionella begränsningar

- Ingen integrerad AI-API-anslutning; idébanken fylls på manuellt av administratör.
- Ingen automatisk kontroll mot kommunens faktiska beslutsdatabas; möjlig dubbelreglering och kommunal kompetens måste kontrolleras manuellt.
- Mallens disposition följer Lekebergs publicerade motionsanvisningar. Tidigare SD-motioner har ännu **inte genomgått fullständig originaldokumentanalys**, och mallens ton har därför inte påståtts vara kopierad ur verkliga motioner.
- Grundläggande statusar finns, men ingen automatisk överföring till kommunens e-tjänst eller digital signering.
- Delning av privata utkast mellan användare är inte byggd i denna etapp. De förblir privata.
- PDF-export har neutralt respektive marinblått/gult inspirerat format. Ingen partilogotyp finns inbyggd. PDF-font använder standard PDF Helvetica/WinAnsi och ersätter sällsynta tecken som inte stöds av den kodningen.
- Arbetsrummet kräver serverbaserad Worker + D1; den publika kartellbyggaren fungerar som lokal `index.html`.
- Inloggning och drift kan inte verifieras i användarens Cloudflare-konto utan åtkomst till kontots Access- och D1-konfiguration. Genomför produktionskontroller innan verkligt internt arbetsmaterial lagras där.
- Befintlig mandatmotor har separata juridiska begränsningar dokumenterade i `JURIDISK_VERIFIERING.md`.

## Fortsatt prioritet

1. Fullständig verifiering av motionsmallens historiska originaldokument och aktuell arbetsordning.
2. Säkerhetsgranskning i den faktiska Cloudflare-miljön, inklusive Access sökvägsmatchning, återställning och dataskyddsbedömning.
3. Versionshanterad delning/gemensam granskning efter uttrycklig behörighet.
4. Genomgång av långtidslagring, säkerhetskopiering, radering och utökade PDF-typsnitt.
