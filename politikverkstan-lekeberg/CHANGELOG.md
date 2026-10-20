# Ändringslogg – Politikverkstan Lekeberg

## 0.5.1 – SD Arbetsrum: samarbete och gemensamma dokument

- **Mina motioner**: sökning, delningsstatus och tidigare funktioner bibehållna.
- **Våra motioner**: särskild vy för gruppdelade eller direktdelade motioner. Kontrollerad åtkomst via delning, inte via administratörsroll.
- **Delningsinställningar**: motionens ägare väljer privat, enskilda personer eller hela arbetsgruppen; read/comment/edit. Gruppdelning föreslår läs- och kommentarsrätt först.
- **Kommentarer**: interna synpunkter per motion, stäng/öppna, behörighetskontroller och avskiljning från PDF.
- **Säker dokumentredigering**: atomisk sparning/versionsarkivering i D1-batch, CAS på revision, kontroll av redigeringsrätt vid skrivning, autosparning som inte tyst förlorar nyare ändringar.
- **Våra idéer**: standardanvändare kan skapa idéer, diskutera med kommentarer och följa status. Ägare/administratör kan uppdatera status.
- **Idé → motion**: skapar ny privat motion; koppling sparas men bara behöriga kan se länkade dokument.
- **D1-migrering `0003_collaboration.sql`**: nya delnings- och kommentarstabeller, revisionsredaktör och idékoppling. Befintliga motioner får *privat* som standard; inga destruktiva DROP/DELETE.
- **Cloudflare Worker `name`** ändrat i paketets exempel till `politikverkstan` för att motsvara nuvarande publicerade projekt. Database UUID är fortfarande platshållare: behåll det verkliga ID:t från användarens fungerande GitHub-konfiguration.
- Befintliga publika beräkningsfiler ändrades inte; regressionstester passerar.

## 0.5.0

Första versionen med separat SD Arbetsrum, inloggningsskyddad motionsredigerare, privat D1-lagring, PDF-mallar, idébank och grundläggande kontohantering. Se äldre utvecklingsdokumentation.
