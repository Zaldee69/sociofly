"use client";

import Head from "next/head";
import * as Sentry from "@sentry/nextjs";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  CheckCircle,
  Activity,
  Zap,
  Database,
  Users,
} from "lucide-react";

// Custom error classes for different scenarios
class SentryExampleFrontendError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryExampleFrontendError";
  }
}

class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "APIError";
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public field: string
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

// Logger utility with Sentry integration
const logger = {
  info: (message: string, extra?: Record<string, any>) => {
    console.log(`[INFO] ${message}`, extra);
    Sentry.addBreadcrumb({
      message,
      level: "info",
      data: extra,
    });
  },
  warn: (message: string, extra?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, extra);
    Sentry.addBreadcrumb({
      message,
      level: "warning",
      data: extra,
    });
  },
  error: (message: string, extra?: Record<string, any>) => {
    console.error(`[ERROR] ${message}`, extra);
    Sentry.addBreadcrumb({
      message,
      level: "error",
      data: extra,
    });
  },
};

export default function Page() {
  const [hasSentError, setHasSentError] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [apiData, setApiData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    async function checkConnectivity() {
      const result = await Sentry.diagnoseSdkConnectivity();
      setIsConnected(result !== "sentry-unreachable");

      logger.info("Sentry connectivity check completed", {
        connected: result !== "sentry-unreachable",
        result,
      });
    }
    checkConnectivity();
  }, []);

  // Performance monitoring example
  const measurePerformance = useCallback(
    async (operationName: string, operation: () => Promise<any>) => {
      return await Sentry.startSpan(
        {
          name: `Performance Test: ${operationName}`,
          op: "performance.test",
          attributes: {
            "test.operation": operationName,
            "test.timestamp": Date.now(),
          },
        },
        async (span) => {
          const startTime = performance.now();

          try {
            const result = await operation();
            const duration = performance.now() - startTime;

            span?.setAttributes({
              "performance.duration_ms": duration,
              "performance.status": "success",
            });

            setPerformanceMetrics((prev) => ({
              ...prev,
              [operationName]: duration,
            }));

            logger.info(`Performance measurement completed`, {
              operation: operationName,
              duration: `${duration.toFixed(2)}ms`,
            });

            return result;
          } catch (error) {
            const duration = performance.now() - startTime;

            span?.setAttributes({
              "performance.duration_ms": duration,
              "performance.status": "error",
              "error.message":
                error instanceof Error ? error.message : "Unknown error",
            });

            logger.error(`Performance measurement failed`, {
              operation: operationName,
              duration: `${duration.toFixed(2)}ms`,
              error: error instanceof Error ? error.message : "Unknown error",
            });

            throw error;
          }
        }
      );
    },
    []
  );

  // Event handlers for different Sentry features
  const handleBasicError = async () => {
    await Sentry.startSpan(
      {
        name: "Basic Error Test",
        op: "ui.click",
        attributes: {
          "ui.component": "error-button",
          "test.type": "basic-error",
        },
      },
      async () => {
        logger.info("User triggered basic error test");
        throw new SentryExampleFrontendError(
          "This is a basic frontend error for testing."
        );
      }
    );
  };

  const handleAPIError = async () => {
    setIsLoading(true);
    try {
      await measurePerformance("API Error Test", async () => {
        logger.info("Starting API error test");
        const res = await fetch("/api/sentry-example-api");
        if (!res.ok) {
          throw new APIError(
            `API request failed with status ${res.status}`,
            res.status
          );
        }
        return res.json();
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          component: "sentry-example",
          test_type: "api_error",
        },
        extra: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        },
      });
      setHasSentError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidationError = async () => {
    await Sentry.startSpan(
      {
        name: "Validation Error Test",
        op: "ui.validation",
        attributes: {
          "validation.field": "email",
          "validation.type": "format",
        },
      },
      async () => {
        logger.warn("Validation error triggered", {
          field: "email",
          value: "invalid-email",
        });
        throw new ValidationError("Invalid email format provided", "email");
      }
    );
  };

  const handlePerformanceTest = async () => {
    try {
      await measurePerformance("Heavy Computation", async () => {
        // Simulate heavy computation
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 2000 + 500)
        );

        // Simulate some data processing
        const data = Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          value: Math.random(),
        }));
        const processed = data
          .filter((item) => item.value > 0.5)
          .map((item) => ({ ...item, processed: true }));

        setApiData(processed.slice(0, 10)); // Show first 10 items
        return processed;
      });
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const handleUserInteraction = (action: string) => {
    Sentry.startSpan(
      {
        name: `User Interaction: ${action}`,
        op: "ui.interaction",
        attributes: {
          "ui.action": action,
          "ui.component": "sentry-example",
          "user.timestamp": Date.now(),
        },
      },
      () => {
        logger.info(`User performed action: ${action}`, {
          timestamp: new Date().toISOString(),
          component: "sentry-example-page",
        });
      }
    );
  };

  const handleCustomSpanTest = async () => {
    await Sentry.startSpan(
      {
        name: "Custom Span with Nested Operations",
        op: "custom.operation",
        attributes: {
          "operation.type": "nested-spans",
          "operation.complexity": "high",
        },
      },
      async (parentSpan) => {
        // First nested operation
        await Sentry.startSpan(
          {
            name: "Database Query Simulation",
            op: "db.query",
            attributes: {
              "db.operation": "SELECT",
              "db.table": "users",
            },
          },
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 300));
            logger.info("Database query completed");
          }
        );

        // Second nested operation
        await Sentry.startSpan(
          {
            name: "External API Call",
            op: "http.client",
            attributes: {
              "http.method": "GET",
              "http.url": "/api/external-service",
            },
          },
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            logger.info("External API call completed");
          }
        );

        parentSpan?.setAttributes({
          "operation.total_nested": 2,
          "operation.status": "completed",
        });
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <Head>
        <title>Sentry Monitoring Demo - Social Media Scheduler</title>
        <meta
          name="description"
          content="Comprehensive Sentry monitoring implementation demo"
        />
      </Head>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <Activity className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Sentry Monitoring Demo
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Comprehensive demonstration of Sentry monitoring features including
            error tracking, performance monitoring, custom spans, and structured
            logging.
          </p>

          {/* Connection Status */}
          <div className="flex items-center justify-center space-x-2">
            {isConnected ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <Badge
                  variant="outline"
                  className="text-green-700 border-green-300"
                >
                  Sentry Connected
                </Badge>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-red-500" />
                <Badge variant="destructive">Sentry Disconnected</Badge>
              </>
            )}
          </div>
        </div>

        {/* Error Testing Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>Error Tracking Tests</span>
            </CardTitle>
            <CardDescription>
              Test different types of errors and exception handling with Sentry
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={handleBasicError}
                disabled={!isConnected}
                variant="destructive"
                className="w-full"
              >
                Basic Frontend Error
              </Button>

              <Button
                onClick={handleAPIError}
                disabled={!isConnected || isLoading}
                variant="destructive"
                className="w-full"
              >
                {isLoading ? "Testing..." : "API Error Test"}
              </Button>

              <Button
                onClick={handleValidationError}
                disabled={!isConnected}
                variant="destructive"
                className="w-full"
              >
                Validation Error
              </Button>
            </div>

            {hasSentError && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-800 font-medium">
                    Error successfully captured by Sentry!
                  </span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  Check your{" "}
                  <a
                    href="https://sociofly.sentry.io/issues/?project=4509648573169664"
                    target="_blank"
                    className="underline font-medium"
                  >
                    Sentry Dashboard
                  </a>{" "}
                  to view the captured error.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Monitoring Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span>Performance Monitoring</span>
            </CardTitle>
            <CardDescription>
              Test performance tracking and custom spans
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={handlePerformanceTest}
                disabled={!isConnected}
                variant="outline"
                className="w-full"
              >
                <Activity className="h-4 w-4 mr-2" />
                Performance Test
              </Button>

              <Button
                onClick={handleCustomSpanTest}
                disabled={!isConnected}
                variant="outline"
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                Custom Spans Test
              </Button>
            </div>

            {/* Performance Metrics Display */}
            {Object.keys(performanceMetrics).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">
                  Performance Metrics:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(performanceMetrics).map(
                    ([operation, duration]) => (
                      <div
                        key={operation}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm text-gray-700">
                          {operation}
                        </span>
                        <Badge variant="secondary">
                          {duration.toFixed(2)}ms
                        </Badge>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Interaction Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span>User Interaction Tracking</span>
            </CardTitle>
            <CardDescription>
              Test user behavior tracking and breadcrumb logging
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                "View Dashboard",
                "Create Post",
                "Schedule Content",
                "View Analytics",
              ].map((action) => (
                <Button
                  key={action}
                  onClick={() => handleUserInteraction(action)}
                  disabled={!isConnected}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {action}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* API Data Display */}
        {apiData && (
          <Card>
            <CardHeader>
              <CardTitle>Performance Test Results</CardTitle>
              <CardDescription>
                Sample data from performance monitoring test
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {apiData.slice(0, 5).map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm">Item #{item.id}</span>
                    <Badge variant="outline">{item.value.toFixed(3)}</Badge>
                  </div>
                ))}
                {apiData.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... and {apiData.length - 5} more items
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documentation Links */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                For more information about Sentry implementation:
              </p>
              <div className="flex justify-center space-x-4">
                <a
                  href="https://docs.sentry.io/platforms/javascript/guides/nextjs/"
                  target="_blank"
                  className="text-purple-600 hover:text-purple-800 underline text-sm"
                >
                  Next.js Documentation
                </a>
                <a
                  href="https://sociofly.sentry.io/issues/?project=4509648573169664"
                  target="_blank"
                  className="text-purple-600 hover:text-purple-800 underline text-sm"
                >
                  Sentry Dashboard
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
