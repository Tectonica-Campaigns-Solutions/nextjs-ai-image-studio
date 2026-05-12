/** Minimal Google font row from /api/fonts/google-catalog (Fontsource-derived). */
export interface GoogleFontCatalogEntry {
  family: string;
  weights: number[];
  styles: string[];
  variable: boolean;
}

export interface GoogleFontCatalogResponse {
  fonts: GoogleFontCatalogEntry[];
}
