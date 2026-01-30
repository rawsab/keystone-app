"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useProject } from "@/lib/queries/projects.queries";
import { useDailyReport } from "@/lib/queries/dailyReports.detail.queries";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/lib/routes";

export function DynamicBreadcrumbs() {
  const pathname = usePathname();

  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectId = projectMatch ? projectMatch[1] : null;

  const reportMatch = pathname.match(
    /^\/projects\/[^/]+\/daily-reports\/([^/]+)$/,
  );
  const reportId = reportMatch ? reportMatch[1] : null;

  const { data: projectResponse, isLoading: projectLoading } = useProject(
    projectId || "",
  );
  const projectName = projectResponse?.data?.name;

  const { data: reportResponse, isLoading: reportLoading } = useDailyReport(
    reportId || "",
  );
  const reportDate = reportResponse?.data?.report_date;

  if (pathname === "/" || pathname === routes.app.dashboard) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  if (pathname === routes.app.projects) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Projects</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  if (pathname === routes.app.settings) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  if (projectId) {
    const isProjectDetail = pathname === `/projects/${projectId}`;
    const isReportsList = pathname === `/projects/${projectId}/daily-reports`;
    const isReportDetail = pathname.match(
      /^\/projects\/[^/]+\/daily-reports\/[^/]+$/,
    );

    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={routes.app.projects}>Projects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {isProjectDetail ? (
              <BreadcrumbPage>
                {projectLoading ? (
                  <Skeleton className="h-4 w-24" />
                ) : (
                  projectName || "Project"
                )}
              </BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link href={routes.project.overview(projectId)}>
                  {projectLoading ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    projectName || "Project"
                  )}
                </Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {(isReportsList || isReportDetail) && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isReportsList ? (
                  <BreadcrumbPage>Daily Reports</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={routes.project.reports(projectId)}>
                      Daily Reports
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </>
          )}
          {isReportDetail && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {reportLoading ? (
                    <Skeleton className="h-4 w-20" />
                  ) : reportDate ? (
                    new Date(reportDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  ) : (
                    "Report"
                  )}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return null;
}
