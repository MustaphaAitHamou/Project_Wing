export const gramsToKgLabel = (g: number) => `${(g / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kg`;
export const kgToGrams = (kg: number) => Math.round(kg * 1000);
export const volumeCm3 = (l: number, w: number, h: number) => l * w * h;
export const litersLabel = (cm3: number) => `${(cm3 / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} L`;
