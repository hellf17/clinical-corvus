// Matches backend models.py enums

export enum MedicationStatus {
    ACTIVE = "active",
    COMPLETED = "completed",
    SUSPENDED = "suspended",
    CANCELLED = "cancelled",
}

export enum MedicationRoute {
    ORAL = "oral",
    INTRAVENOUS = "intravenous",
    INTRAMUSCULAR = "intramuscular",
    SUBCUTANEOUS = "subcutaneous",
    TOPICAL = "topical",
    INHALATION = "inhalation",
    RECTAL = "rectal",
    OTHER = "other",
}

export enum MedicationFrequency {
    ONCE = "once",
    DAILY = "daily",
    BID = "bid",
    TID = "tid",
    QID = "qid",
    CONTINUOUS = "continuous",
    AS_NEEDED = "as_needed",
    OTHER = "other",
    // Add backend human-readable ones if they might appear
    ONCE_DAILY = "Once daily", 
    TWICE_DAILY = "Twice daily",
    THREE_TIMES_DAILY = "Three times daily",
    FOUR_TIMES_DAILY = "Four times daily",
}

// Add other enums like NoteType if needed 