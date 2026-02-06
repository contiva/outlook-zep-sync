/**
 * ZEP SOAP API Client
 * 
 * SOAP-basierte Schnittstelle zu ZEP (Zeiterfassung Projektmanagement)
 * Verwendet die ZEP SOAP API V10
 */

import * as soap from "soap";

// =============================================================================
// CONFIGURATION
// =============================================================================

const ZEP_SOAP_ENDPOINT = process.env.ZEP_SOAP_ENDPOINT || 
  "https://www.zep-online.de/zepcontiva/sync/soap.php?v=10&wsdl";

// =============================================================================
// TYPE DEFINITIONS - Request/Response Headers
// =============================================================================

interface RequestHeader {
  authorizationToken: string;
}

interface ResponseHeader {
  version?: string;
  returnCode: string | number; // "0" = success, >"0" = error
  message?: string;
}

// =============================================================================
// TYPE DEFINITIONS - Projektzeit (Time Entries)
// =============================================================================

export interface SoapProjektzeit {
  id?: string;
  userId: string;         // Benutzername (z.B. "rfels")
  datum: string;          // ISO Date: YYYY-MM-DD
  von?: string;           // ISO Time: HH:MM
  bis?: string;           // ISO Time: HH:MM
  dauer?: string;         // Format: HH:MM
  istFakturierbar?: boolean;
  bemerkung?: string;
  projektNr: string;      // Projektnummer
  vorgangNr: string;      // Vorgangsnummer
  taetigkeit: string;     // Taetigkeitskuerzel (z.B. "be", "ew")
  ort?: string;           // Arbeitsort (max 32 Zeichen, z.B. "Büro", "Home Office")
  projektId?: number;
  vorgangId?: number;
  created?: string;
  modified?: string;
}

interface ReadProjektzeitenSearchCriteria {
  von?: string;           // ISO Date: YYYY-MM-DD
  bis?: string;           // ISO Date: YYYY-MM-DD
  userIdListe?: { userId: string[] };
  projektNrListe?: { projektNr: string[] };
  projektId?: number;
}

interface CreateProjektzeitRequest {
  requestHeader: RequestHeader;
  projektzeit: SoapProjektzeit;
}

interface UpdateProjektzeitRequest {
  requestHeader: RequestHeader;
  projektzeit: SoapProjektzeit;
}

interface ReadProjektzeitenRequest {
  requestHeader: RequestHeader;
  readProjektzeitenSearchCriteria: ReadProjektzeitenSearchCriteria;
}

interface CreateProjektzeitResponse {
  responseHeader: ResponseHeader;
  ids?: string;
}

interface UpdateProjektzeitResponse {
  responseHeader: ResponseHeader;
  ids?: string;
}

interface ReadProjektzeitenResponse {
  responseHeader: ResponseHeader;
  projektzeitListe?: {
    projektzeiten?: SoapProjektzeit | SoapProjektzeit[];
  };
}

// =============================================================================
// TYPE DEFINITIONS - Projekt
// =============================================================================

// Projekt-Tätigkeit: Eine dem Projekt zugeordnete Tätigkeit
export interface ProjektTaetigkeit {
  taetigkeit: string;    // Kürzel der Tätigkeit (z.B. "re", "vw")
  standard?: boolean;    // true wenn dies die Standard-Tätigkeit ist
  defaultFakt?: number;  // 0=Einstellung vom Vorgang, 1-4=Fakt-Einstellung
}

// Projekt-Arbeitsort: Ein dem Projekt zugeordneter Arbeitsort (Einschränkung)
export interface ProjektOrt {
  ort: string;           // Kurzform des Arbeitsortes (String32, max 32 Zeichen)
  action?: string;       // z.B. "delete" (nur für SOAP-Mutations)
}

// Globaler Arbeitsort aus der ZEP-Ortsliste
export interface SoapOrt {
  kurzform: string;      // Kürzel (String32, z.B. "H", "O", "D")
  bezeichnung?: string;  // Volltext (String64, z.B. "Homeoffice")
  heimarbeitsort?: boolean;
  inland?: boolean;
  waehrung?: string;
}

// Ortsliste (kann mehrere gültige Listen geben, nach Datum gefiltert)
interface SoapOrtsliste {
  id?: number;
  gueltigAb?: string;
  gueltigBis?: string;
  bemerkung?: string;
  ort?: SoapOrt | SoapOrt[];
}

interface ReadOrtslisteRequest {
  requestHeader: RequestHeader;
  readOrtslisteSearchCriteria?: {
    datum?: string;       // IsoDate - liefert Ortsliste gültig an diesem Datum
  };
}

interface ReadOrtslisteResponse {
  responseHeader: ResponseHeader;
  ortslisteListe?: {
    ortsliste?: SoapOrtsliste | SoapOrtsliste[];
  };
}

export interface SoapProjekt {
  id?: number;
  projektNr: string;
  kundenNr?: string;
  bezeichnung: string;
  abteilung?: string;
  startDatum?: string;
  endeDatum?: string;
  bemerkung?: string;
  status?: string;
  projektmitarbeiterListe?: {
    projektmitarbeiter?: SoapProjektMitarbeiter | SoapProjektMitarbeiter[];
  };
  vorgangListe?: {
    vorgang?: SoapVorgang | SoapVorgang[];
  };
  projekttaetigkeitListe?: {
    taetigkeit?: ProjektTaetigkeit | ProjektTaetigkeit[];
  };
  projektortListe?: {
    ort?: ProjektOrt | ProjektOrt[];
  };
  // Fakturierbarkeits-Voreinstellungen
  // voreinstFakturierbarkeit (int1_4): 
  //   1=Voreinstellung Fakturierbar, durch Mitarbeiter änderbar
  //   2=Voreinstellung Fakturierbar, durch Mitarbeiter NICHT änderbar
  //   3=Voreinstellung Nicht Fakturierbar, durch Mitarbeiter änderbar
  //   4=Voreinstellung Nicht Fakturierbar, durch Mitarbeiter NICHT änderbar
  voreinstFakturierbarkeit?: number;
  // defaultFakt (int1_4): Projekt-Level Fakturierbarkeit
  //   1=Fakturierbar änderbar, 2=Fakturierbar nicht änderbar
  //   3=Nicht fakturierbar änderbar, 4=Nicht fakturierbar nicht änderbar
  defaultFakt?: number;
}

export interface SoapProjektMitarbeiter {
  id?: number;
  projektNr?: string;
  userId: string;
  von?: string;
  bis?: string;
  bemerkung?: string;
  projektId?: number;
}

interface ReadProjekteSearchCriteria {
  id?: number;
  von?: string;
  bis?: string;
  projektNr?: string;
  abteilung?: string;
  status?: string;
  userId?: string;        // Mitarbeiter-Filter
}

interface ReadProjekteRequest {
  requestHeader: RequestHeader;
  readProjekteSearchCriteria: ReadProjekteSearchCriteria;
}

interface ReadProjekteResponse {
  responseHeader: ResponseHeader;
  projektListe?: {
    projekt?: SoapProjekt | SoapProjekt[];
  };
}

// =============================================================================
// TYPE DEFINITIONS - Vorgang (Task)
// =============================================================================

export interface VorgangMitarbeiter {
  id?: number;
  userId?: string;
  von?: string; // Start date of assignment (YYYY-MM-DD)
  bis?: string; // End date of assignment (YYYY-MM-DD)
  vorgangNr?: string;
  projektNr?: string;
}

// Vorgang-Tätigkeit: Eine dem Vorgang zugeordnete Tätigkeit
export interface VorgangTaetigkeit {
  taetigkeit: string;    // Kürzel der Tätigkeit (z.B. "re", "vw")
  standard?: boolean;    // true wenn dies die Standard-Tätigkeit ist
}

export interface SoapVorgang {
  id?: number;
  vorgangNr: string;
  vorgangName?: string; // Die Bezeichnung/Inhaltsbeschreibung des Vorgangs
  projektNr?: string;
  startDatum?: string;
  endeDatum?: string;
  status?: string;
  bemerkung?: string;
  projektId?: number;
  vorgangMitarbeiterListe?: {
    vorgangMitarbeiter?: VorgangMitarbeiter | VorgangMitarbeiter[];
    alleImplizitZugeordnet?: boolean;
  };
  vorgangstaetigkeitListe?: {
    taetigkeit?: VorgangTaetigkeit | VorgangTaetigkeit[];
  };
  // defaultFakt (int0_4): Fakturierbarkeits-Einstellung auf Vorgang-Ebene
  //   0 = Fakturierbarkeit vom Projekt geerbt
  //   1 = Fakturierbar, änderbar durch Mitarbeiter
  //   2 = Fakturierbar, NICHT änderbar durch Mitarbeiter
  //   3 = Nicht fakturierbar, änderbar durch Mitarbeiter
  //   4 = Nicht fakturierbar, NICHT änderbar durch Mitarbeiter
  defaultFakt?: number;
}

interface ReadVorgangSearchCriteria {
  projektNr?: string;
  projektId?: number;
  id?: number;
  vorgangNr?: string;
  startDatum?: string;
  endeDatum?: string;
  statusListe?: { status: string[] };
}

interface ReadVorgangRequest {
  requestHeader: RequestHeader;
  readVorgangSearchCriteria?: ReadVorgangSearchCriteria;
}

interface ReadVorgangResponse {
  responseHeader: ResponseHeader;
  vorgangListe?: {
    vorgang?: SoapVorgang | SoapVorgang[];
  };
}

// =============================================================================
// TYPE DEFINITIONS - Mitarbeiter (Employee)
// =============================================================================

export interface SoapMitarbeiter {
  userId: string;
  nachname: string;
  vorname: string;
  email?: string;
  personalNr?: string;
  abteilung?: string;
}

interface ReadMitarbeiterSearchCriteria {
  userId?: string;
  von?: string;
  bis?: string;
  abteilung?: string;
  email?: string;
}

interface ReadMitarbeiterRequest {
  requestHeader: RequestHeader;
  readMitarbeiterSearchCriteria: ReadMitarbeiterSearchCriteria;
}

interface ReadMitarbeiterResponse {
  responseHeader: ResponseHeader;
  mitarbeiterListe?: {
    mitarbeiter?: SoapMitarbeiter | SoapMitarbeiter[];
  };
}

// =============================================================================
// TYPE DEFINITIONS - Taetigkeit (Activity)
// =============================================================================

export interface SoapTaetigkeit {
  taetigkeit: string;     // Kuerzel (z.B. "be", "ew", "re")
  bezeichnung?: string;   // Beschreibung
  bemerkung?: string;
  istReise?: boolean;
}

interface ReadTaetigkeitRequest {
  requestHeader: RequestHeader;
  readTaetigkeitSearchCriteria?: {
    taetigkeit?: string;
  };
}

interface ReadTaetigkeitResponse {
  responseHeader: ResponseHeader;
  taetigkeitListe?: {
    taetigkeit?: SoapTaetigkeit | SoapTaetigkeit[];
  };
}

// =============================================================================
// SOAP CLIENT SINGLETON
// =============================================================================

let soapClient: soap.Client | null = null;

/**
 * Get or create SOAP client instance
 */
async function getClient(): Promise<soap.Client> {
  if (soapClient) {
    return soapClient;
  }

  return new Promise((resolve, reject) => {
    soap.createClient(ZEP_SOAP_ENDPOINT, (err, client) => {
      if (err) {
        console.error("Failed to create SOAP client:", err);
        reject(new Error(`SOAP client creation failed: ${err.message}`));
        return;
      }
      
      soapClient = client;
      resolve(client);
    });
  });
}

/**
 * Helper: Ensure array from SOAP response (handles single item vs array)
 */
function ensureArray<T>(items: T | T[] | undefined): T[] {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

/**
 * Helper: Check SOAP response for errors
 */
function checkResponse(responseHeader: ResponseHeader, operation: string): void {
  // returnCode can be string "0" or number 0
  const code = String(responseHeader.returnCode);
  if (code !== "0") {
    throw new Error(
      `ZEP SOAP ${operation} failed: ${responseHeader.message || `Error code ${code}`}`
    );
  }
}

// =============================================================================
// PUBLIC API - Projects
// =============================================================================

/**
 * Read projects from ZEP via SOAP
 * 
 * @param token - ZEP SOAP API token
 * @param criteria - Optional search criteria
 * @returns Array of projects
 */
export async function readProjekte(
  token: string,
  criteria: ReadProjekteSearchCriteria = {}
): Promise<SoapProjekt[]> {
  const client = await getClient();

  const request: ReadProjekteRequest = {
    requestHeader: { authorizationToken: token },
    readProjekteSearchCriteria: criteria,
  };

  return new Promise((resolve, reject) => {
    client.readProjekte(request, (err: Error | null, result: ReadProjekteResponse) => {
      if (err) {
        reject(new Error(`SOAP readProjekte failed: ${err.message}`));
        return;
      }

      try {
        checkResponse(result.responseHeader, "readProjekte");
        const projekte = ensureArray(result.projektListe?.projekt);
        resolve(projekte);
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Get bookable projects for an employee
 * Filters by:
 * - Employee assignment (userId)
 * - Project status (excludes closed projects)
 * - Project date range (startDatum/endeDatum must include reference date)
 * - Employee assignment period (von/bis of projektmitarbeiter must include reference date)
 */
export async function getBookableProjects(
  token: string,
  userId?: string,
  referenceDate?: string // Date for which to check if project is bookable (YYYY-MM-DD)
): Promise<SoapProjekt[]> {
  const criteria: ReadProjekteSearchCriteria = {};
  
  if (userId) {
    criteria.userId = userId;
  }
  
  // Use date filter in SOAP call to reduce data transfer
  // von/bis in readProjekte filters by project date range overlap
  if (referenceDate) {
    criteria.von = referenceDate;
    criteria.bis = referenceDate;
  }

  const projekte = await readProjekte(token, criteria);
  
  // Use reference date or today for filtering
  const checkDate = referenceDate || new Date().toISOString().split("T")[0];
  
  // Closed project statuses
  const closedStatuses = ["abgeschlossen", "geschlossen", "beendet", "archiviert"];
  
  return projekte.filter(p => {
    // 1. Filter by project status - exclude closed projects
    if (p.status && closedStatuses.includes(p.status.toLowerCase())) {
      return false;
    }
    
    // 2. Filter by project date range
    // Project must have started (startDatum <= checkDate)
    if (p.startDatum && p.startDatum > checkDate) {
      return false;
    }
    // Project must not have ended (endeDatum >= checkDate)
    if (p.endeDatum && p.endeDatum < checkDate) {
      return false;
    }
    
    // 3. Filter by employee assignment period (if userId provided)
    if (userId && p.projektmitarbeiterListe?.projektmitarbeiter) {
      const mitarbeiter = ensureArray(p.projektmitarbeiterListe.projektmitarbeiter);
      const userAssignment = mitarbeiter.find(m => m.userId === userId);
      
      if (userAssignment) {
        // Check assignment start date (von <= checkDate)
        if (userAssignment.von && userAssignment.von > checkDate) {
          return false;
        }
        // Check assignment end date (bis >= checkDate)
        if (userAssignment.bis && userAssignment.bis < checkDate) {
          return false;
        }
      }
      // If no assignment found for user, the SOAP API already filtered by userId,
      // so this shouldn't happen - but keep the project just in case
    }
    
    return true;
  });
}

// =============================================================================
// PUBLIC API - Vorgaenge (Tasks)
// =============================================================================

/**
 * Read Vorgaenge (tasks) for a project via SOAP
 */
export async function readVorgang(
  token: string,
  criteria: ReadVorgangSearchCriteria
): Promise<SoapVorgang[]> {
  const client = await getClient();

  const request: ReadVorgangRequest = {
    requestHeader: { authorizationToken: token },
    readVorgangSearchCriteria: criteria,
  };

  return new Promise((resolve, reject) => {
    client.readVorgang(request, (err: Error | null, result: ReadVorgangResponse) => {
      if (err) {
        reject(new Error(`SOAP readVorgang failed: ${err.message}`));
        return;
      }

      try {
        checkResponse(result.responseHeader, "readVorgang");
        const vorgaenge = ensureArray(result.vorgangListe?.vorgang);
        resolve(vorgaenge);
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Bookable task statuses - these are filtered directly in the SOAP API
const BOOKABLE_TASK_STATUSES = [
  "offen",
  "Bestellung fehlt", 
  "Keine Planstunden",
  "ausstehend",
  "in Arbeit",
];

/**
 * Get tasks for a project, filtering by:
 * - Status (via SOAP API - only bookable statuses)
 * - Date range (exclude expired tasks, optionally check start date)
 * - Employee assignment (if userId provided)
 */
export async function getProjectTasks(
  token: string,
  projektNr: string,
  options?: {
    userId?: string;
    referenceDate?: Date; // Date to check against (for calendar entries)
  }
): Promise<SoapVorgang[]> {
  // Filter by bookable statuses directly in the SOAP API
  const vorgaenge = await readVorgang(token, { 
    projektNr,
    statusListe: { status: BOOKABLE_TASK_STATUSES }
  });
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const referenceDate = options?.referenceDate || today;
  const refDateOnly = new Date(referenceDate);
  refDateOnly.setHours(0, 0, 0, 0);
  
  return vorgaenge.filter(v => {
    // Exclude tasks that have ended before the reference date
    if (v.endeDatum) {
      const endDate = new Date(v.endeDatum);
      endDate.setHours(0, 0, 0, 0);
      if (endDate < refDateOnly) return false;
    }
    
    // Exclude tasks that haven't started yet (if startDatum is set)
    if (v.startDatum) {
      const startDate = new Date(v.startDatum);
      startDate.setHours(0, 0, 0, 0);
      if (startDate > refDateOnly) return false;
    }
    
    // Check employee assignment if userId is provided
    if (options?.userId) {
      const mitarbeiterListe = v.vorgangMitarbeiterListe;
      
      // If alleImplizitZugeordnet is true, all project members are assigned
      if (mitarbeiterListe?.alleImplizitZugeordnet) {
        return true;
      }
      
      // Check if user is in the vorgangMitarbeiter list
      if (mitarbeiterListe?.vorgangMitarbeiter) {
        const mitarbeiter = ensureArray(mitarbeiterListe.vorgangMitarbeiter);
        const userAssignment = mitarbeiter.find(m => m.userId === options.userId);
        
        if (!userAssignment) {
          return false; // User not assigned to this task
        }
        
        // Check if assignment is valid for the reference date
        if (userAssignment.von) {
          const assignmentStart = new Date(userAssignment.von);
          assignmentStart.setHours(0, 0, 0, 0);
          if (assignmentStart > refDateOnly) return false;
        }
        if (userAssignment.bis) {
          const assignmentEnd = new Date(userAssignment.bis);
          assignmentEnd.setHours(0, 0, 0, 0);
          if (assignmentEnd < refDateOnly) return false;
        }
      } else {
        // No explicit assignments and not implicitly assigned - exclude
        return false;
      }
    }
    
    return true;
  });
}

// =============================================================================
// PUBLIC API - Mitarbeiter (Employees)
// =============================================================================

/**
 * Read employees from ZEP via SOAP
 */
export async function readMitarbeiter(
  token: string,
  criteria: ReadMitarbeiterSearchCriteria = {}
): Promise<SoapMitarbeiter[]> {
  const client = await getClient();

  const request: ReadMitarbeiterRequest = {
    requestHeader: { authorizationToken: token },
    readMitarbeiterSearchCriteria: criteria,
  };

  return new Promise((resolve, reject) => {
    client.readMitarbeiter(request, (err: Error | null, result: ReadMitarbeiterResponse) => {
      if (err) {
        reject(new Error(`SOAP readMitarbeiter failed: ${err.message}`));
        return;
      }

      try {
        checkResponse(result.responseHeader, "readMitarbeiter");
        const mitarbeiter = ensureArray(result.mitarbeiterListe?.mitarbeiter);
        resolve(mitarbeiter);
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Find employee by email address
 */
export async function findEmployeeByEmail(
  token: string,
  email: string
): Promise<SoapMitarbeiter | null> {
  // Try direct email search first
  const byEmail = await readMitarbeiter(token, { email });
  if (byEmail.length > 0) {
    return byEmail[0];
  }

  // Fallback: Get all employees and match
  const allEmployees = await readMitarbeiter(token, {});
  const normalizedEmail = email.toLowerCase();
  
  // Exact email match
  const exactMatch = allEmployees.find(
    emp => emp.email?.toLowerCase() === normalizedEmail
  );
  if (exactMatch) return exactMatch;

  // Try username pattern matching (e.g., robert.fels@domain.com -> rfels)
  const localPart = email.split("@")[0].toLowerCase();
  const parts = localPart.split(".");
  
  if (parts.length >= 2) {
    const shortUsername = parts[0].charAt(0) + parts[parts.length - 1];
    const matchByUsername = allEmployees.find(
      emp => emp.userId.toLowerCase() === shortUsername
    );
    if (matchByUsername) return matchByUsername;
  }

  return null;
}

// =============================================================================
// PUBLIC API - Taetigkeiten (Activities)
// =============================================================================

/**
 * Read activities from ZEP via SOAP
 */
export async function readTaetigkeit(
  token: string,
  taetigkeit?: string
): Promise<SoapTaetigkeit[]> {
  const client = await getClient();

  const request: ReadTaetigkeitRequest = {
    requestHeader: { authorizationToken: token },
    readTaetigkeitSearchCriteria: taetigkeit ? { taetigkeit } : undefined,
  };

  return new Promise((resolve, reject) => {
    client.readTaetigkeit(request, (err: Error | null, result: ReadTaetigkeitResponse) => {
      if (err) {
        reject(new Error(`SOAP readTaetigkeit failed: ${err.message}`));
        return;
      }

      try {
        checkResponse(result.responseHeader, "readTaetigkeit");
        const taetigkeiten = ensureArray(result.taetigkeitListe?.taetigkeit);
        resolve(taetigkeiten);
      } catch (e) {
        reject(e);
      }
    });
  });
}

// =============================================================================
// PUBLIC API - Ortsliste (Work Locations)
// =============================================================================

/**
 * Read global work locations from ZEP via SOAP.
 * Returns all OrtType entries from the Ortsliste valid on the given date.
 */
export async function readOrtsliste(
  token: string,
  datum?: string
): Promise<SoapOrt[]> {
  const client = await getClient();

  const request: ReadOrtslisteRequest = {
    requestHeader: { authorizationToken: token },
    readOrtslisteSearchCriteria: datum ? { datum } : undefined,
  };

  return new Promise((resolve, reject) => {
    client.readOrtsliste(request, (err: Error | null, result: ReadOrtslisteResponse) => {
      if (err) {
        reject(new Error(`SOAP readOrtsliste failed: ${err.message}`));
        return;
      }

      try {
        checkResponse(result.responseHeader, "readOrtsliste");
        const ortslisten = ensureArray(result.ortslisteListe?.ortsliste);
        // Flatten all OrtType entries from all valid Ortslisten, deduplicate by kurzform
        const seen = new Set<string>();
        const allOrte: SoapOrt[] = [];
        for (const liste of ortslisten) {
          const orte = ensureArray(liste.ort);
          for (const ort of orte) {
            if (!seen.has(ort.kurzform)) {
              seen.add(ort.kurzform);
              allOrte.push(ort);
            }
          }
        }
        resolve(allOrte);
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Map SoapOrt to a simpler format for the frontend.
 */
export function mapOrtToRestFormat(ort: SoapOrt) {
  return {
    kurzform: ort.kurzform,
    bezeichnung: ort.bezeichnung || ort.kurzform,
    heimarbeitsort: ort.heimarbeitsort || false,
  };
}

// =============================================================================
// PUBLIC API - Projektzeiten (Time Entries)
// =============================================================================

/**
 * Read time entries from ZEP via SOAP
 */
export async function readProjektzeiten(
  token: string,
  criteria: ReadProjektzeitenSearchCriteria
): Promise<SoapProjektzeit[]> {
  const client = await getClient();

  const request: ReadProjektzeitenRequest = {
    requestHeader: { authorizationToken: token },
    readProjektzeitenSearchCriteria: criteria,
  };

  return new Promise((resolve, reject) => {
    client.readProjektzeiten(request, (err: Error | null, result: ReadProjektzeitenResponse) => {
      if (err) {
        reject(new Error(`SOAP readProjektzeiten failed: ${err.message}`));
        return;
      }

      try {
        checkResponse(result.responseHeader, "readProjektzeiten");
        const projektzeiten = ensureArray(result.projektzeitListe?.projektzeiten);
        resolve(projektzeiten);
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Get time entries for an employee in a date range
 */
export async function getTimeEntries(
  token: string,
  userId: string,
  startDate: string,
  endDate: string
): Promise<SoapProjektzeit[]> {
  return readProjektzeiten(token, {
    von: startDate,
    bis: endDate,
    userIdListe: { userId: [userId] },
  });
}

/**
 * Create a new time entry in ZEP via SOAP
 */
export async function createProjektzeit(
  token: string,
  projektzeit: Omit<SoapProjektzeit, "id" | "created" | "modified">
): Promise<string> {
  const client = await getClient();

  const request: CreateProjektzeitRequest = {
    requestHeader: { authorizationToken: token },
    projektzeit: projektzeit as SoapProjektzeit,
  };

  return new Promise((resolve, reject) => {
    client.createProjektzeit(request, (err: Error | null, result: CreateProjektzeitResponse) => {
      if (err) {
        reject(new Error(`SOAP createProjektzeit failed: ${err.message}`));
        return;
      }

      try {
        checkResponse(result.responseHeader, "createProjektzeit");
        resolve(result.ids || "");
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Update an existing time entry in ZEP via SOAP
 * Used for rebooking entries to different project/task or changing activity
 */
export async function updateProjektzeit(
  token: string,
  projektzeit: SoapProjektzeit
): Promise<string> {
  if (!projektzeit.id) {
    throw new Error("updateProjektzeit requires projektzeit.id");
  }

  const client = await getClient();

  const request: UpdateProjektzeitRequest = {
    requestHeader: { authorizationToken: token },
    projektzeit,
  };

  return new Promise((resolve, reject) => {
    client.updateProjektzeit(request, (err: Error | null, result: UpdateProjektzeitResponse) => {
      if (err) {
        reject(new Error(`SOAP updateProjektzeit failed: ${err.message}`));
        return;
      }

      try {
        checkResponse(result.responseHeader, "updateProjektzeit");
        resolve(result.ids || "");
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Delete a time entry in ZEP via SOAP
 */
export async function deleteProjektzeit(
  token: string,
  id: string
): Promise<void> {
  const client = await getClient();

  const request = {
    requestHeader: { authorizationToken: token },
    id: parseInt(id, 10),
  };

  return new Promise((resolve, reject) => {
    client.deleteProjektzeit(request, (err: Error | null, result: { responseHeader: ResponseHeader }) => {
      if (err) {
        reject(new Error(`SOAP deleteProjektzeit failed: ${err.message}`));
        return;
      }

      try {
        checkResponse(result.responseHeader, "deleteProjektzeit");
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}

// =============================================================================
// HELPER FUNCTIONS - Date/Time Formatting
// =============================================================================

/**
 * Format date for ZEP SOAP API (YYYY-MM-DD)
 */
export function formatSoapDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format time for ZEP SOAP API (HH:MM)
 */
export function formatSoapTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Round time down to nearest 15-minute interval
 */
export function roundTimeDown(date: Date): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const roundedMinutes = Math.floor(minutes / 15) * 15;
  rounded.setMinutes(roundedMinutes, 0, 0);
  return rounded;
}

/**
 * Round time up to nearest 15-minute interval
 */
export function roundTimeUp(date: Date): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const remainder = minutes % 15;
  
  if (remainder === 0) {
    rounded.setSeconds(0, 0);
    return rounded;
  }
  
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  
  if (roundedMinutes === 60) {
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
  } else {
    rounded.setMinutes(roundedMinutes, 0, 0);
  }
  
  return rounded;
}

/**
 * Format start time for ZEP (rounded down to 15-min interval)
 */
export function formatSoapStartTime(date: Date): string {
  return formatSoapTime(roundTimeDown(date));
}

/**
 * Format end time for ZEP (rounded up to 15-min interval)
 */
export function formatSoapEndTime(date: Date): string {
  return formatSoapTime(roundTimeUp(date));
}

// =============================================================================
// MAPPING FUNCTIONS - Convert SOAP types to REST-compatible types
// =============================================================================

/**
 * Map SOAP Projekt to REST-compatible ZepProject format
 * REST API uses: name = projektNr, description = bezeichnung
 */
export function mapProjektToRestFormat(projekt: SoapProjekt) {
  // Extract activities from projekttaetigkeitListe
  let activities: Array<{ name: string; standard: boolean; defaultFakt?: number }> = [];
  if (projekt.projekttaetigkeitListe?.taetigkeit) {
    const taetigkeitData = projekt.projekttaetigkeitListe.taetigkeit;
    const taetigkeitArray = Array.isArray(taetigkeitData) ? taetigkeitData : [taetigkeitData];
    activities = taetigkeitArray.map(t => ({
      name: t.taetigkeit,
      standard: t.standard || false,
      defaultFakt: t.defaultFakt, // 0=vom Vorgang, 1-4=eigene Einstellung
    }));
  }

  // Extract work locations from projektortListe
  let workLocations: string[] = [];
  if (projekt.projektortListe?.ort) {
    const ortData = projekt.projektortListe.ort;
    const ortArray = Array.isArray(ortData) ? ortData : [ortData];
    workLocations = ortArray
      .filter(o => o.action !== "delete")
      .map(o => o.ort);
  }

  return {
    id: projekt.id || 0,
    name: projekt.projektNr,           // REST uses projektNr as name
    description: projekt.bezeichnung || "", // REST uses bezeichnung as description
    project_status_id: projekt.status || "",
    status: {
      id: projekt.status || "",
      name: projekt.status || "",
      bookable: true, // SOAP doesn't have this directly
    },
    customer_id: projekt.kundenNr || null,
    start_date: projekt.startDatum || null,
    end_date: projekt.endeDatum || null,
    projektNr: projekt.projektNr, // Keep original for SOAP calls
    activities, // Zugeordnete Tätigkeiten
    workLocations,
    // Fakturierbarkeits-Voreinstellungen
    voreinstFakturierbarkeit: projekt.voreinstFakturierbarkeit,
    defaultFakt: projekt.defaultFakt,
  };
}

/**
 * Map SOAP Vorgang to REST-compatible ZepTask format
 * Note: In ZEP SOAP, vorgangNr is the identifier, vorgangName is the full description
 */
export function mapVorgangToRestFormat(vorgang: SoapVorgang) {
  // Extract activities from vorgangstaetigkeitListe
  let activities: Array<{ name: string; standard: boolean }> = [];
  if (vorgang.vorgangstaetigkeitListe?.taetigkeit) {
    const taetigkeitData = vorgang.vorgangstaetigkeitListe.taetigkeit;
    const taetigkeitArray = Array.isArray(taetigkeitData) ? taetigkeitData : [taetigkeitData];
    activities = taetigkeitArray.map(t => ({
      name: t.taetigkeit,
      standard: t.standard || false,
    }));
  }

  return {
    id: vorgang.id || 0,
    name: vorgang.vorgangNr, // vorgangNr is the task identifier
    description: vorgang.vorgangName || null, // vorgangName is the full description/Inhaltsbeschreibung
    status: vorgang.status || null,
    project_id: vorgang.projektId || 0,
    start_date: vorgang.startDatum || null,
    end_date: vorgang.endeDatum || null,
    vorgangNr: vorgang.vorgangNr, // Keep original for SOAP calls
    projektNr: vorgang.projektNr,
    activities, // Zugeordnete Tätigkeiten (leer = erbt vom Projekt)
    // Fakturierbarkeits-Einstellung (0=vom Projekt geerbt, 1-4=eigene Einstellung)
    defaultFakt: vorgang.defaultFakt,
  };
}

/**
 * Ermittelt die Fakturierbarkeit basierend auf Projekt- und Vorgang-Einstellungen.
 * 
 * Hierarchie:
 * 1. Vorgang.defaultFakt (wenn != 0): verwendet die Vorgang-Einstellung
 * 2. Sonst: Projekt.voreinstFakturierbarkeit oder Projekt.defaultFakt
 * 
 * Werte (int1_4 bzw. int0_4):
 *   0 = vom Projekt geerbt (nur bei Vorgang)
 *   1 = Fakturierbar, änderbar durch Mitarbeiter
 *   2 = Fakturierbar, NICHT änderbar durch Mitarbeiter
 *   3 = Nicht fakturierbar, änderbar durch Mitarbeiter
 *   4 = Nicht fakturierbar, NICHT änderbar durch Mitarbeiter
 * 
 * @param projektFakt - voreinstFakturierbarkeit oder defaultFakt vom Projekt (int1_4)
 * @param vorgangFakt - defaultFakt vom Vorgang (int0_4), 0 = vom Projekt geerbt
 * @returns boolean - true wenn fakturierbar, false wenn nicht fakturierbar
 */
export function determineBillable(
  projektFakt: number | undefined,
  vorgangFakt: number | undefined
): boolean {
  // Vorgang hat eigene Einstellung (nicht 0 = "geerbt")
  if (vorgangFakt !== undefined && vorgangFakt !== 0) {
    // 1, 2 = Fakturierbar; 3, 4 = Nicht Fakturierbar
    return vorgangFakt === 1 || vorgangFakt === 2;
  }
  
  // Fallback auf Projekt-Einstellung
  if (projektFakt !== undefined) {
    // 1, 2 = Fakturierbar; 3, 4 = Nicht Fakturierbar
    return projektFakt === 1 || projektFakt === 2;
  }
  
  // Default: fakturierbar (wenn keine Einstellung vorhanden)
  return true;
}

/**
 * Map SOAP Mitarbeiter to REST-compatible ZepEmployee format
 */
export function mapMitarbeiterToRestFormat(mitarbeiter: SoapMitarbeiter) {
  return {
    username: mitarbeiter.userId,
    firstname: mitarbeiter.vorname,
    lastname: mitarbeiter.nachname,
    email: mitarbeiter.email || null,
  };
}

/**
 * Map SOAP Taetigkeit to REST-compatible ZepActivity format
 */
export function mapTaetigkeitToRestFormat(taetigkeit: SoapTaetigkeit) {
  return {
    name: taetigkeit.taetigkeit,
    description: taetigkeit.bezeichnung || "",
    is_travel: taetigkeit.istReise || false,
  };
}

/**
 * Map SOAP Projektzeit to REST-compatible ZepAttendance format
 */
export function mapProjektzeitToRestFormat(projektzeit: SoapProjektzeit) {
  // Convert HH:MM to HH:MM:SS format
  const fromTime = projektzeit.von ? `${projektzeit.von}:00` : "00:00:00";
  const toTime = projektzeit.bis ? `${projektzeit.bis}:00` : "00:00:00";
  
  return {
    id: projektzeit.id ? parseInt(projektzeit.id, 10) : undefined,
    date: projektzeit.datum ? `${projektzeit.datum}T00:00:00.000000Z` : "",
    from: fromTime,
    to: toTime,
    employee_id: projektzeit.userId,
    duration: projektzeit.dauer ? parseDurationToMinutes(projektzeit.dauer) : undefined,
    note: projektzeit.bemerkung || null,
    // SOAP returns "true"/"false" as strings, need explicit check
    billable: projektzeit.istFakturierbar === true || String(projektzeit.istFakturierbar).toLowerCase() === "true",
    activity_id: projektzeit.taetigkeit,
    project_id: projektzeit.projektId || 0,
    project_task_id: projektzeit.vorgangId || 0,
    work_location_id: projektzeit.ort || null,
    // Keep SOAP-specific fields for reference
    projektNr: projektzeit.projektNr,
    vorgangNr: projektzeit.vorgangNr,
  };
}

/**
 * Parse duration string (HH:MM) to minutes
 */
function parseDurationToMinutes(duration: string): number {
  const parts = duration.split(":");
  if (parts.length >= 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return 0;
}
