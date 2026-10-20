# Säkerhet och kända begränsningar – 0.5.1

Systemet är avsett för en liten, behörighetsstyrd grupp som skriver politiska arbetsutkast. Detta är inte ett officiellt system för kommunala handlingar.

**Tillgång:** Cloudflare Access ska skydda arbetsrummet och varje privat API-anrop. Workern verifierar dessutom Access-JWT kryptografiskt och slår upp en **aktiv** användare i D1. Dokumentnivå: ägare, direktdelning eller aktiv gruppdelning. Administratörsroll ger ingen implicit läsrätt till motioner.

**Standardsekretess:** gamla och nya motioner är privata tills ägaren delar. Kommentarer syns bara för personer med dokumentåtkomst, och kommentarer exporteras inte till PDF. Användare som fått ta del av ett dokument kan ha sparat en kopia; att återkalla delning förhindrar framtida serverhämtningar men kan inte ta bort redan utlämnad information.

**Versionskonflikter:** En revision kontrolleras vid varje uppdatering, och versionsarkivering och ändring sker i en D1-batch. Real-tidssamredigering (Google Docs-stil) finns inte. Vid konflikt måste användaren själv hantera skillnaden, och lokala osparade ändringar ska inte skrivas över automatiskt.

**PDF:** PDF skapas lokalt efter kontroll att dokumentet kan hämtas. Inga interna kommentarer eller delningsbehörigheter inkluderas. Användaren ansvarar för att texten är sakligt korrekt och lämplig för formell inlämning.

**Integritet:** Säkerhetsloggar/IP-loggning och publik kartelltelemetri är avstängda som standard i exempelkonfigurationen. Privata motioner och interna idéer skickas inte till externt AI-API. D1 hos Cloudflare är fortfarande tredjepartsdrift och personuppgiftsansvar behöver bedömas.

**Driftgräns:** Endast lokal testning. Separat säkerhetsgranskning, backup-/återställningstest och behörighetsprov med minst två faktiska Access-identiteter rekommenderas före skarpt grupparbete.

**SQL:** `migrations/0003_collaboration.sql` är en engångsmigrering från korrekt installerad 0.5.0. Upprepa inte `ALTER TABLE`-satser och kör inte migrationen mot en felaktig eller okänd databas. Säkerhetskopiera innan körning.
