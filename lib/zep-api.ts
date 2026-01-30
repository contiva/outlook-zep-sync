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

// Interface for employee-task assignments
export interface ZepEmployeeTask {
  id: number;
  employee_id: string;
  project_task_id: number;
  from: string | null;
  to: string | null;
}

// Get tasks for a specific project (filtered by employee assignment and validity)
export async function getZepProjectTasks(
  token: string,
  projectId: number,
  employeeId?: string
): Promise<ZepTask[]> {
  const tasks = await fetchAllPages<ZepTask>(
    `/api/v1/projects/${projectId}/tasks`,
    token
  );
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get employee task assignments if employeeId is provided
  let employeeTaskIds: Set<number> | null = null;
  if (employeeId) {
    try {
      const employeeTasks = await fetchAllPages<ZepEmployeeTask>(
        `/api/v1/employees/${employeeId}/projecttasks`,
        token
      );
      
      // Filter assignments that are currently valid
      const validAssignments = employeeTasks.filter((et) => {
        // Check from date
        if (et.from) {
          const fromDate = new Date(et.from);
          fromDate.setHours(0, 0, 0, 0);
          if (fromDate > today) return false;
        }
        // Check to date
        if (et.to) {
          const toDate = new Date(et.to);
          toDate.setHours(0, 0, 0, 0);
          if (toDate < today) return false;
        }
        return true;
      });
      
      employeeTaskIds = new Set(validAssignments.map((et) => et.project_task_id));
      console.log(`Employee ${employeeId} has ${employeeTaskIds.size} valid task assignments for project ${projectId}`);
    } catch (error) {
      console.log(`Could not fetch employee task assignments, showing all tasks: ${error}`);
    }
  }
  
  // Filter tasks
  return tasks.filter((t) => {
    // Check status - only "in Arbeit" (remove null status)
    if (t.status !== "in Arbeit") return false;
    
    // Check end date
    if (t.end_date) {
      const taskEndDate = new Date(t.end_date);
      taskEndDate.setHours(0, 0, 0, 0);
      if (taskEndDate < today) return false;
    }
    
    // Check employee assignment if available
    if (employeeTaskIds !== null && !employeeTaskIds.has(t.id)) {
      return false;
    }
    
    return true;
  });
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
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Use provided date range or default to today
  const rangeStart = startDate ? new Date(startDate) : today;
  const rangeEnd = endDate ? new Date(endDate) : today;
  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(23, 59, 59, 999);
  
  // Filter assignments: only include those where the employee is currently assigned
  // An assignment is valid if:
  // - assignment.from is null OR assignment.from <= rangeEnd
  // - assignment.to is null OR assignment.to >= rangeStart
  const validAssignments = assignments.filter((a) => {
    const assignmentFrom = a.from ? new Date(a.from) : null;
    const assignmentTo = a.to ? new Date(a.to) : null;
    
    if (assignmentFrom) {
      assignmentFrom.setHours(0, 0, 0, 0);
    }
    if (assignmentTo) {
      assignmentTo.setHours(23, 59, 59, 999);
    }
    
    // Check if assignment period overlaps with the requested date range
    const fromOk = !assignmentFrom || assignmentFrom <= rangeEnd;
    const toOk = !assignmentTo || assignmentTo >= rangeStart;
    
    return fromOk && toOk;
  });
  
  // Get unique project IDs from valid assignments
  const projectIds = [...new Set(validAssignments.map((a) => a.project_id))];
  
  if (projectIds.length === 0) {
    return [];
  }
  
  // Get all projects and filter to assigned ones
  const allProjects = await getZepProjects(token);
  
  // Filter to only include:
  // 1. Projects assigned to the employee (with valid assignment period)
  // 2. Projects that are still valid (end_date is null OR end_date >= today)
  return allProjects.filter((p) => {
    // Must be assigned to employee
    if (!projectIds.includes(p.id)) return false;
    
    // Check if project is still valid (not expired)
    if (p.end_date) {
      const projectEndDate = new Date(p.end_date);
      projectEndDate.setHours(0, 0, 0, 0);
      if (projectEndDate < today) return false;
    }
    
    return true;
  });
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
