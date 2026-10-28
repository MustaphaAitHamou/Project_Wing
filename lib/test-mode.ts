/**
 * Mode test : vrai en développement et en test, ou sur un build de production lancé avec
 * E2E_TEST_MODE=true (tests end-to-end uniquement). Active les simulateurs, les corridors
 * TEST_ONLY, les pages /dev et assouplit les limites de débit.
 * NE JAMAIS définir E2E_TEST_MODE sur un environnement accessible au public.
 */
export const isTestMode = () => process.env.NODE_ENV !== "production" || process.env.E2E_TEST_MODE === "true";
export const rateLimitsRelaxed = () => isTestMode() && process.env.RATE_LIMIT_RELAXED === "true";
