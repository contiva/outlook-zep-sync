export interface ZepProject {
  id: string;
  name: string;
}

export interface ZepTimeEntry {
  projectId: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
}

export async function getZepProjects(
  zepUrl: string,
  token: string
): Promise<ZepProject[]> {
  const response = await fetch(`${zepUrl}/api/v1/projects`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`ZEP API error: ${response.status}`);
  }

  return response.json();
}

export async function createZepTimeEntry(
  zepUrl: string,
  token: string,
  entry: ZepTimeEntry
): Promise<void> {
  const response = await fetch(`${zepUrl}/api/v1/timeentries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(entry),
  });

  if (!response.ok) {
    throw new Error(`ZEP API error: ${response.status}`);
  }
}
