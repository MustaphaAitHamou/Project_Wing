import { config } from "dotenv";
// Base de test dédiée : jamais la base de développement.
config({ path: ".env.test", override: true, quiet: true });
config({ quiet: true });
