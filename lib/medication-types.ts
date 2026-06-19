export type MedicineSearchResult = {
  id: number;
  name: string;
  description: string;
  img_url?: string;
};

export type MedicationDose = {
  id: number;
  strength: string;
};

export type ActiveIngredient = {
  id: number;
  name: string;
};

export type MedicineDetails = {
  id: number;
  name: string;
  description: string;
  img_url?: string;
  activeIngredients: ActiveIngredient[];
  doses: string[];
};
