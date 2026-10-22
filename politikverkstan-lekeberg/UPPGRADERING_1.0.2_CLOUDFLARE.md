# Politikverkstan 1.0.2 – Offentlig sammanträdeskalender

## Leverans
- En läsbar månadskalender över fyra officiella sammanträdesorgan i den skyddade fliken **Sammanträden**.
- Källa: `https://meetings.lekeberg.se/committees/{slug}`, begränsat till kommunfullmäktige (KF), barn- och utbildningsnämnden (BUN), socialnämnden (SN) och kommunstyrelsen (KS).
- Kalendern visar datum, start- och sluttid, eventuellt publicerad plats, källänk och senaste lyckade hämtning. Visas även om det saknas egna möten.
- Import sker automatiskt genom Cloudflare Workers befintliga cron `0 3 * * *` (03:00 UTC, inte svensk lokal tid). Administratörer kan också starta hämtning direkt med knappen **Hämta från kommunen**, tidigast 5 minuter efter föregående försök.
- Endast metadata från publika sidor importeras. Inga PDF-filer laddas ned, inga personuppgifter eller privata anteckningar skickas till kommunen. `work_meetings`, `work_meeting_notes` och `work_meeting_items` ändras inte av synkroniseringen.

## Databasmigrering 0012

`migrations/0012_official_meetings.sql` lägger till två separata tabeller:
- `official_meetings`: offentlig mötesmetadata med unik källadress, namn, datum/tid, plats och tidsstämplar.
- `official_meeting_sources`: senast försökt/lyckats, felindikering och mötesantal per källa.

Migreringen ändrar inga äldre tabeller eller användardata och måste köras **en gång** efter 0011. Vid befintligt kontrollerat Cloudflare-deployflöde körs den automatiskt via `npm run deploy:cloudflare`, efter att de äldre posterna 0001–0011 verifierats.

**Säkerhetskopiera D1 före första produktionsmigreringen**, och kontrollera i Cloudflare efter publicering:

```sql
SELECT name FROM d1_migrations ORDER BY id;
SELECT committee_key, last_success_at, last_count, last_error
FROM official_meeting_sources ORDER BY committee_key;
SELECT committee, meeting_date, start_time, end_time, location, source_url
FROM official_meetings ORDER BY meeting_date LIMIT 30;
PRAGMA foreign_key_check;
PRAGMA quick_check;
```

Förväntat är **12** migrationsposter 0001–0012. Importtabellerna kan vara tomma tills nästa cron eller en administratör tryckt **Hämta från kommunen**.

## Första röktestet

1. Kontrollera att senaste Cloudflare Builds för `main` har lyckats och att migration 0012 registrerats.
2. Logga in med ett godkänt Cloudflare Access-konto, gå till **Sammanträden**. En månadsöversikt över offentliga möten ska synas ovanför dina egna möten.
3. Om ingen källa hämtats ännu: som administratör, tryck **Hämta från kommunen**. Vänta in svaret i vyn. Kontrollera sedan D1-tabellen `official_meeting_sources` för alla fyra källor.
4. Växla mellan månader och kontrollera att de officiella mötena leder till `https://meetings.lekeberg.se`.
5. Öppna och redigera ett eget privat möte; dess anteckningar och dagordning ska vara oförändrade.
6. Om en källa markerar fel men tidigare uppgifter finns visas dessa fortsatt. Kontrollera uppströms webbplats och parserns kompatibilitet; systemet raderar inte uppgifter bara för att webbplatsen misslyckades.

## Avgränsningar och kvalitetsrisker

- Mötet är **inte** en officiell kallelse eller bevis på att ett möte verkligen genomfördes. Källa och status måste kontrolleras på originalwebbplatsen.
- Ingen officiellt dokumenterad API-kontrakt har verifierats för MeetingPlus. Importen bygger därför på publika HTML-länkar. Ändrad sidstruktur kan ge importfel; detta ska framgå av synkroniseringsstatus och tidigare data får inte raderas.
- Frånvaro på ett senare webbplatsutdrag betyder inte automatiskt inställt möte. Kvarvarande uppgifter märks med tid för senaste inläsning och bör verifieras mot originalkällan.
- Dagordningar och handlingar (PDF) integreras ännu inte. Kommande funktion måste hantera källversioner, offentliga/sekretesskyddade handlingar, lagringskostnader och separering från privata dokument.
- Chromium-/Node-tester kör lokalt med HTML-fixturer och kontrollerad D1-simulering, inte mot kommunens liveserver. Bekräfta faktisk första lyckade import i D1 innan den anses produktionsverifierad.
