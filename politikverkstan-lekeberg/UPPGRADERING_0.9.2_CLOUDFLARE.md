# Politikverkstan 0.9.2 – Min arbetsöversikt

## Vad som ingår

Den skyddade startsidan visar kommande sammanträden, egna och tilldelade ärenden, uppföljningar och pågående motionsutkast. Klicka på ett möte eller ärende för att öppna det direkt. Listorna innehåller endast material som användaren redan får läsa.

**Mina uppgifter** är en ny personlig att-göra-lista med prioritet, förfallodatum och möjlighet att koppla en uppgift till ett tillgängligt ärende eller sammanträde. Uppgifter kan skapas, ändras, markeras klara, öppnas igen och raderas. **Ingen annan användare, inte ens en administratör, får läsa personliga uppgifter.** Detta kontrolleras av Worker och D1 vid varje API-anrop.

Det här är ett internt planeringsverktyg, inte en kommunal möteskalender, ett formellt beslutsregister eller ett officiellt partiyttrande.

## Obligatorisk D1-migrering 0010

Version 0.9.2 kräver migrationsfilen **migrations/0010_dashboard_tasks.sql**, körd i produktionsdatabasen efter 0009_meetings.sql. Den skapar tabellen work_tasks och ett index och ändrar inga gamla ärenden eller möten.

1. Bekräfta att 0001–0009 har körts i **rätt D1-databas**. Kontrollera särskilt work_meetings och work_cases.
2. Ta en verifierbar säkerhetskopia av D1. Följ backup- och återställningsrutinerna i [0.9.1-guiden](UPPGRADERING_0.9.1_CLOUDFLARE.md).
3. Kör **endast** migrationsfil 0010_dashboard_tasks.sql. Kör inte om de äldre ALTER TABLE-migreringarna.
4. Verifiera via följande läsfrågor i D1 Console:

~~~sql
SELECT name FROM sqlite_master WHERE type='table' AND name='work_tasks';
PRAGMA table_info(work_tasks);
PRAGMA foreign_key_check;
~~~

Den första frågan ska returnera en rad. Den andra ska bland annat visa owner_email, title, due_date, priority, done, revision, case_id och meeting_id. Den tredje ska inte visa några främmande-nyckelfel.

5. Publicera den uppdaterade Workern och Arbetsytans byggda HTML via den befintliga Cloudflare-pipelinen.
6. Testa med minst två separata godkända Access-konton: konto A skapar en privat uppgift, konto B (även med administratörsroll) får inte se eller ändra den. Kontrollera dessutom att användaren inte kan koppla uppgiften till någon annans privata ärende eller sammanträde.
7. Kontrollera på både mobil och dator: uppgiftsskapande, förfallodatum, prioritet, klarmarkering, ångring, radering, tillgängliga länkar och behörighetskontroll.

Om Workern publiceras före D1-migreringen ska översikten visa att uppgiftskällan inte är tillgänglig. Den ska inte framställa saknade uppgifter som faktiska nollresultat.

## Kvalitetskontroller

Kör från mappen politikverkstan-lekeberg:

~~~bash
python build.py
npm test
npm run test:browser
python build.py --check
~~~

Node-regressionen tests/test-tasks.mjs testar flera användare, privata kopplingar, validering och revisionskonflikter. Migrationssviten spelar upp 0001–0010. Browser-testet tests/test-dashboard-ui.py går igenom personlig översikt, uppgiftsskapande, klarmarkering, redigering och navigering.

Säkerställ två gröna jobb i GitHub Actions på senaste commit: **Build and tests** samt **Chromium browser regressions**. Testsviten är delvis mockad och verifierar inte produktionsmiljön.

## Begränsningar

- Det finns ännu ingen gemensam uppgiftsfördelning, ingen kalendersynkronisering och inga automatiska påminnelser.
- Ansvar för gemensamma ärenden hanteras fortfarande av ärendets ägare och utsedd ansvarig. Personliga uppgifter delas inte.
- Uppföljningssiffran är summan av öppna egna uppgifter och egna/tilldelade ärenden med status Uppföljning. Den är inte ett mått på antalet kommunala beslut som kräver åtgärd.
- Översikten använder de befintliga API-listorna; listgränser gör att siffrorna inte garanteras vara uttömmande för stora datamängder.
- En uppgift finns kvar även om ett länkat objekt tas bort. Då tas referensen bort utan att uppgiften raderas.
- Förfallodatum jämförs mot användarens lokala datum och ersätter inte en rättsligt kontrollerad tidsfrist.
- Ingen ny Access-policy, telemetriinställning eller extern AI-tjänst ingår i versionen.

Driftsättning, säkerhetskopiering, produktions-D1 och verkliga behörighetsprov behöver verifieras separat.
