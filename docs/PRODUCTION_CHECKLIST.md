# Checklist de mise en production

## Juridique et opérationnel (bloquant)
- [ ] Points 1, 3, 6, 7, 8, 9 de COMPLIANCE_CHECKLIST.md validés par écrit
- [ ] CGU, confidentialité, cookies, mentions légales rédigées par un juriste ; marqueurs « [À VALIDER] » supprimés
- [ ] Liste des objets interdits consolidée (douanes FR/DZ, IATA)
- [ ] Procédures internes : modération, litiges (délais, barème), support, réponse aux réquisitions
- [ ] Médiateur de la consommation désigné

## Prestataires
- [ ] Stripe : compte activé, Connect activé, profil plateforme validé, webhooks configurés, parcours testé en mode test réel
- [ ] Pays de versement confirmés par écrit par Stripe ; `country.payoutsEnabled` aligné
- [ ] Stripe Identity activé et testé
- [ ] Resend : domaine vérifié (SPF, DKIM, DMARC), adresse d'expédition
- [ ] Bucket S3 privé, chiffré, versionné ; clé à droits minimaux
- [ ] (Option) Twilio enregistré pour la France et l'Algérie

## Technique
- [ ] Variables de production définies ; `E2E_TEST_MODE`, `RATE_LIMIT_RELAXED`, `SEED_DEMO` **absentes**
- [ ] Secrets générés aléatoirement (≥ 32 caractères), stockés dans le coffre de l'hébergeur
- [ ] `pnpm db:deploy` en étape de release ; `pnpm db:seed` (référentiels)
- [ ] Crons `/api/cron/jobs` (1 min) et `/api/cron/maintenance` (1 h) actifs, ou worker `pnpm jobs:run`
- [ ] HTTPS + HSTS ; domaine personnalisé ; `APP_URL` en https
- [ ] Sauvegardes automatiques + PITR ; export logique hebdomadaire ; restauration testée
- [ ] Monitoring : Sentry intégré, alertes sur erreurs 5xx, échecs de webhooks (`payment_event.error`), jobs FAILED, versements FAILED
- [ ] Premier administrateur créé, 2FA activée ; comptes de démonstration absents
- [ ] Corridors : passer en LIVE uniquement ceux validés
- [ ] `pnpm audit` sans vulnérabilité haute ; CI verte
- [ ] Lighthouse ≥ 90 (performance, accessibilité, bonnes pratiques) mesuré sur la préproduction
- [ ] Test de charge léger (recherche, connexion, SSE)
- [ ] `/.well-known/security.txt` et adresse de signalement de vulnérabilités
