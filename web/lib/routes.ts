export const routes = {
  auth: {
    login: "/login",
    register: "/register",
  },
  app: {
    dashboard: "/",
    projects: "/projects",
    files: "/files",
    settings: "/settings",
  },
  project: {
    overview: (projectId: string) => `/projects/${projectId}`,
    reports: (projectId: string) => `/projects/${projectId}/daily-reports`,
    report: (projectId: string, reportId: string) =>
      `/projects/${projectId}/daily-reports/${reportId}`,
    files: (projectId: string) => `/projects/${projectId}/files`,
  },
} as const;
