# Politikverkstan 1.0.2 – Offentlig sammanträdeskalender

## Aktuell lösning (GitHub → Cloudflare)

Den ursprungliga importen via Cloudflare Workerns utgående `fetch()` misslyckades mot samtliga fyra MeetingPlus-sidor med nätverksfel. Samma fyra sidor kunde läsas och tolkas korrekt i GitHub Actions. Därför är den operativa importen flyttad från Cloudflare till GitHub.

1. GitHub Actions, workflow `.github/workflows/meetingplus-calendar.yml`, körs två gånger dagligen (05:35 och 17:35 UTC) samt manuellt.
2. `ops/refresh-official-calendar.mjs` hämtar fyra fasta offentliga MeetingPlus-källor, kontrollerar länkar/datum och bygger `worker/official-meetings-cache.mjs`. Vid fel bevaras tidigare uppgifter per källa, med tydlig felstatus.
3. Om uppgifterna ändrats committar workflowfilen den nya offentliga ögonblicksbilden till `main` med GitHubs inbyggda token. **Inga API-nycklar för Cloudflare eller GitHub behöver läggas till**.
4. Den befintliga GitHub-anslutningen för Cloudflare Workers Builds ska publicera den nya kodversionen. Workern läser då den inbyggda ögonblicksbilden lokalt och gör **inga nätverksanrop till MeetingPlus**.
5. `GET /api/private/official-meetings` lämnar datum, tider, eventuellt publicerad plats, originaladress och hämtningsstatus till inloggade användare. Befintliga privata möten och anteckningar påverkas inte.

`Hämta från kommunen` har tagits bort från arbetsytan eftersom realtidshämtning inte fungerar i Cloudflare. `Uppdatera vy` läser den senast publicerade ögonblicksbilden. Den som vill ha ett nytt källutdrag omedelbart kan starta GitHub Actions-workflowet manuellt.

## Initial kontroll

- Kontrollera [GitHub Actions – MeetingPlus](https://github.com/politikverkstan/politikverkstan/actions/workflows/meetingplus-calendar.yml) och att jobbet har åtkomst att skriva tillbaka offentliga kalenderdata till `main`.
- Kontrollera att `worker/official-meetings-cache.mjs` innehåller `generated_at`, fyra poster och minst ett validerat möte per källa.
- Kontrollera att Cloudflare Workers Builds verkligen publicerat **kalenderdatacommitten**, inte bara den tidigare funktionskoden.
- Öppna **Arbetsytan → Sammanträden**, klicka **Uppdatera vy** och kontrollera fyra källors senaste hämtning samt datum i kalendern. Öppna originaladresserna hos kommunen och jämför tider.
- Vid fel visas orsak per organ och tidigare kända kalenderposter bevaras när det är möjligt. Ett misslyckat GitHub-jobb får inte skriva över den inlästa ögonblicksbilden med tomt innehåll.

## Databas

`0012_official_meetings.sql` skapade tidigare de separata tabellerna `official_meetings` och `official_meeting_sources`. De ligger kvar i D1 som äldre versionsdata, men **den uppdaterade kalendern använder nu en inbyggd GitHub-ögonblicksbild** och behöver ingen ny D1-migrering. Migreringen 0012 ska inte köras om. Den ordinarie `wrangler`-publiceringen behålls.

## Säkerhet och begränsningar

- Endast fyra allowlistade offentliga kommittésidor läses. Hämtningen sker utan användarcookies eller inloggningsuppgifter.
- Ögonblicksbilden innehåller endast officiellt publicerade mötesmetadata och publiceras som kod i GitHub. Inga privata anteckningar, interna möten eller dokument ingår.
- GitHub-jobbet skriver inte en tom kalender om alla fyra externa källor misslyckas. Källornas HTML kan ändras och måste kontrolleras vid parserfel.
- Ändringar i kommunens kalender syns först efter nästa lyckade GitHub-hämtning **och** lyckad Cloudflare-publicering; detta är inte en realtidstjänst.
- Publicerade tider är preliminära tills de kontrolleras mot kallelsen. Inga PDF-handlingar eller dagordningar lagras i denna version.
