import type { AppProps } from "next/app";
import React, { useEffect } from "react";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-web";

const provider = typeof window !== "undefined" ? new WebTracerProvider() : null;
if (provider) {
  const exporter = new OTLPTraceExporter({ url: "/otlp/v1/traces" });
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  provider.register();
}

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // placeholder span hook; instrument router/events as needed
  }, []);
  return <Component {...pageProps} />;
}
