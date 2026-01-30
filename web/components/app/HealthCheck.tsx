"use client";

import { useQuery } from "@tanstack/react-query";
import { health } from "@/lib/api/endpoints/health";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";

export function HealthCheck() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["health"],
    queryFn: health,
    retry: false,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backend Health Check</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {!isLoading && data?.data && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="ml-2">
              Backend is reachable and healthy
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && (data?.error || isError) && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                {data?.error?.message || "Backend is unreachable"}
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Connection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
