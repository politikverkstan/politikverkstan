# Politikverkstan 1.8 – Mitt nästa sammanträde

## Vad som är nytt

Arbetsytans översikt visar ett aktuellt kommande sammanträde och en knapp till vyn **Mitt nästa sammanträde**. Vyn sammanför kommunens offentliga mötesinformation med enskilda användares befintliga, behörighetsstyrda sammanträdesförberedelser. Val av annat kommande sammanträde görs i samma vy.

För varje dagordningspunkt visas en arbetsindikator:
- **Ej påbörjad:** ingen sparad förberedelsetext finns.
- **Ärende kopplat, förberedelse saknas:** en ärendekoppling finns men inga egna anteckningar.
- **Uppföljning noterad:** uppföljning finns men inte ett eget förberedelseunderlag.
- **Underlag antecknat:** text utöver en automatiskt förifylld källpåminnelse har sparats.

Procenttalet avser **punkter med egen text**. Det är inte en bedömning av att underlaget är korrekt, komplett, juridiskt hållbart eller internt förankrat.

En användare kan skapa ett eget privat möte, välja vilka offentliga punkter som läggs till, spara förberedelser och uppföljningar och öppna kopplade ärenden eller privata personliga anteckningar. Handlingar visas som originalänkar; inga PDF-bytes eller dokument importeras automatiskt. Om en privat förberedelse redan finns kopplad till originalkällan återanvänds den. Team-delade sammanträden ger inte automatiskt rätt att skapa privata anteckningar eller ändra gruppens material.

## Begränsningar

- Inga nya tabeller eller D1-migreringar. Indikatorerna härleds från befintlig dagordningstext och kan inte ersätta ett uttryckligt formellt beslut eller ett justerat protokoll.
- Källornas tillgänglighet och dagordningens fullständighet beror på kommunens publicerade MeetingPlus-sidor. Ej identifierade punkter redovisas inte som faktiska ärenden.
- Förberedelsen visar kommande möten inom kalenderns och möteslistans begränsningar. För möten längre fram kan en manuell förberedelse krävas.
- Testsviten kan inte bekräfta verkliga Cloudflare Access-roller, produktions-D1, backup eller dataskyddsbeslut. Se `RELEASE_1.7.1.md`.

## Acceptanskriterier

1. Nästa sammanträde visas i startsidans översikt, från åtkomlig offentlig eller privat källa.
2. Offentlig dagordning kan visas utan privat möte.
3. Privat möte skapas bara efter eget val, med `mine` som standard.
4. Sparade punkter kan redigeras, kopplas till ärenden och återupptas; inget dubbelskapat möte vid nästa besök.
5. Tydlig mobilvy, separat offentlig originalkälla och åtskilda privata anteckningar.
