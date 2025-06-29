// Enum for frontend display values
export enum InformationTypeNeededEnumFE {
  OVERVIEW = "Visão Geral",
  DIAGNOSTIC_CRITERIA = "Critérios Diagnósticos",
  TYPICAL_ILLNESS_SCRIPT = "Script Típico da Doença",
  MANAGEMENT_GUIDELINES_SUMMARY = "Resumo das Diretrizes de Manejo",
  ETIOLOGY_PATHOPHYSIOLOGY = "Etiologia/Fisiopatologia",
  PROGNOSIS = "Prognóstico",
}

// Backend enum keys - for constructing the payload
export enum InformationTypeNeededEnumBE {
  OVERVIEW = "OVERVIEW",
  DIAGNOSTIC_CRITERIA = "DIAGNOSTIC_CRITERIA",
  TYPICAL_ILLNESS_SCRIPT = "TYPICAL_ILLNESS_SCRIPT",
  MANAGEMENT_GUIDELINES_SUMMARY = "MANAGEMENT_GUIDELINES_SUMMARY",
  ETIOLOGY_PATHOPHYSIOLOGY = "ETIOLOGY_PATHOPHYSIOLOGY",
  PROGNOSIS = "PROGNOSIS",
}

// Mapping from frontend display value to backend enum key
export const informationTypeMap: Record<InformationTypeNeededEnumFE, keyof typeof InformationTypeNeededEnumBE> = {
  [InformationTypeNeededEnumFE.OVERVIEW]: "OVERVIEW",
  [InformationTypeNeededEnumFE.DIAGNOSTIC_CRITERIA]: "DIAGNOSTIC_CRITERIA",
  [InformationTypeNeededEnumFE.TYPICAL_ILLNESS_SCRIPT]: "TYPICAL_ILLNESS_SCRIPT",
  [InformationTypeNeededEnumFE.MANAGEMENT_GUIDELINES_SUMMARY]: "MANAGEMENT_GUIDELINES_SUMMARY",
  [InformationTypeNeededEnumFE.ETIOLOGY_PATHOPHYSIOLOGY]: "ETIOLOGY_PATHOPHYSIOLOGY",
  [InformationTypeNeededEnumFE.PROGNOSIS]: "PROGNOSIS",
}; 