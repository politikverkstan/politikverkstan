# Releaseplan 1.3.1–1.4.0 (2026-10-23)
## Kodfunktioner
- Status *delvis verifierad* med separat lista över faktiskt verifierade fält.
- Organisationernas registrerade källor och senare beredningsunderlag hålls isär.
- Källvarning vid alla simulerade nämndfördelningar utan helt aktuellt underlag.
- Testskydd så att 57 organisationsposter och förslagsstatus bevaras.
- Läsande kontroll av migrationshistorik 0001–0013 och databasens integritet. Ingen databas ändras av kontrollen.

## Drift: EJ verifierat i skarp miljö
1. Kontrollera faktisk Cloudflare Access-policy för arbetsyta, privata API:er och administration.
2. Ta krypterad export och återställ till separat test-D1, utan att röra produktion.
3. Kör `npm run check:production` med behörig Cloudflare-identitet; stoppa vid avvikelse.
4. Verifiera två användarkonton, delning/återkallad delning, dokument och anteckningsisolering.
5. Publicering **efter** grön CI är inte tekniskt säkerställd av repositoryt. Nuvarande Cloudflare Builds kan publicera `main` innan GitHub-testningen är klar. Inför därför godkänd releasebranch eller Cloudflare-grind, och skydda den. Ändra inte databasmigreringar innan detta är konfigurerat.
6. Kontrollera personuppgiftsansvar, rättslig grund, biträdesavtal, gallring och integritetspolicy före bred användning.
7. Smoka publika och skyddade vyer med verkliga data och mobila klienter.

**Klar-kriterium:** gröna automatiska tester PLUS godkänd separat produktionschecklista.
