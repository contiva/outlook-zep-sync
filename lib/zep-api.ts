// ZEP API Base URL for Contiva
export const ZEP_BASE_URL = "https://www.zep-online.de/zepcontiva/next";

export interface ZepProjectStatus {
  id: string;
  name: string;
  bookable: boolean;
}

export interface ZepProject {
  id: number;
  name: string;
  description: string;
  project_status_id: string;
  status: ZepProjectStatus;
  customer_id: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface ZepTask {
  id: number;
  name: string;
  description: string | null;
  status: string | null;
  project_id: number;
  start_date: string | null;
  end_date: string | null;
}

export interface ZepActivity {
  name: string;
  description: string;
  is_travel: boolean;
}

export interface ZepEmployee {
  username: string;
  firstname: string;
  lastname: string;
  email: string | null;
}

export interface ZepEmployeeProject {
  id: number;
  employee_id: string;
  project_id: number;
  from: string | null; // ISO date or null
  to: string | null; // ISO date or null
  note: string | null;
  availability: number | null;
}

export interface ZepAttendance {
  id?: number;
  date: string; // ISO date format: "2026-01-30T00:00:00.000000Z"
  from: string; // Time format: "09:00:00"
  to: string; // Time format: "17:00:00"
  employee_id: string; // username like "rfels"
  duration?: number;
  note: string | null;
  billable: boolean;
  activity_id: string; // Activity name like "be", "ew", "re"
  project_id: number;
  project_task_id: number;
  work_location_id?: string | null;
}

export interface ZepPaginatedResponse<T> {
  data: T[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

async function fetchZepApi<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${ZEP_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ZEP API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

// Fetch all pages of a paginated endpoint
async function fetchAllPages<T>(
  endpoint: string,
  token: string
): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const separator = endpoint.includes("?") ? "&" : "?";
    const response = await fetchZepApi<ZepPaginatedResponse<T>>(
      `${endpoint}${separator}page=${page}`,
      token
    );
    allItems.push(...response.data);
    hasMore = response.meta.current_page < response.meta.last_page;
    page++;
  }

  return allItems;
}

// Get all projects (only bookable ones for time entry)
export async function getZepProjects(token: string): Promise<ZepProject[]> {
  const projects = await fetchAllPages<ZepProject>("/api/v1/projects", token);
  // Filter to only show bookable projects
  return projects.filter((p) => p.status?.bookable === true);
}

// Get tasks for a specific project
export async function getZepProjectTasks(
  token: string,
  projectId: number
): Promise<ZepTask[]> {
  const tasks = await fetchAllPages<ZepTask>(
    `/api/v1/projects/${projectId}/tasks`,
    token
  );
  // Filter to only show active tasks (status "in Arbeit" or null)
  return tasks.filter(
    (t) => t.status === "in Arbeit" || t.status === null
  );
}

// Get all activities
export async function getZepActivities(token: string): Promise<ZepActivity[]> {
  const response = await fetchZepApi<ZepPaginatedResponse<ZepActivity>>(
    "/api/v1/activities",
    token
  );
  return response.data;
}

// Get current employee info
export async function getZepEmployees(token: string): Promise<ZepEmployee[]> {
  return fetchAllPages<ZepEmployee>("/api/v1/employees", token);
}

// Get projects assigned to a specific employee
export async function getZepEmployeeProjects(
  token: string,
  employeeId: string
): Promise<ZepEmployeeProject[]> {
  return fetchAllPages<ZepEmployeeProject>(
    `/api/v1/employees/${employeeId}/projects`,
    token
  );
}

// Get projects for employee, filtered by date range
export async function getZepProjectsForEmployee(
  token: string,
  employeeId: string,
  startDate?: string,
  endDate?: string
): Promise<ZepProject[]> {
  // First get all employee project assignments
  const assignments = await getZepEmployeeProjects(token, employeeId);
  
  // Filter assignments by date range if provided
  const validAssignments = assignments.filter((a) => {
    // If no date filter, include all
    if (!startDate && !endDate) return true;
    
    const assignmentFrom = a.from ? new Date(a.from) : null;
    const assignmentTo = a.to ? new Date(a.to) : null;
    const rangeStart = startDate ? new Date(startDate) : null;
    const rangeEnd = endDate ? new Date(endDate) : null;
    
    // If assignment has no date restrictions, it's always valid
    if (!assignmentFrom && !assignmentTo) return true;
    
    // Check if date ranges overlap
    // Assignment is valid if: assignmentFrom <= rangeEnd AND assignmentTo >= rangeStart
    const fromOk = !assignmentFrom || !rangeEnd || assignmentFrom <= rangeEnd;
    const toOk = !assignmentTo || !rangeStart || assignmentTo >= rangeStart;
    
    return fromOk && toOk;
  });
  
  // Get unique project IDs
  const projectIds = [...new Set(validAssignments.map((a) => a.project_id))];
  
  // Get all projects and filter to assigned ones
  const allProjects = await getZepProjects(token);
  return allProjects.filter((p) => projectIds.includes(p.id));
}

// Create a new attendance (time entry)
export async function createZepAttendance(
  token: string,
  attendance: Omit<ZepAttendance, "id" | "duration">
): Promise<ZepAttendance> {
  return fetchZepApi<ZepAttendance>("/api/v1/attendances", token, {
    method: "POST",
    body: JSON.stringify(attendance),
  });
}

// Helper: Format date for ZEP API
export function formatZepDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, ".000000Z");
}

// Helper: Format time for ZEP API (HH:mm:ss)
export function formatZepTime(date: Date): string {
  return date.toTimeString().slice(0, 8);
}
