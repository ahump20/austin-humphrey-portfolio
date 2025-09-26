import React from "react";
import Link from "next/link";
import DeveloperModePanel from "../../components/DeveloperModePanel";

export default function DevHome(): JSX.Element {
  return (
    <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Developer Mode</h1>
      <p>Blaze Intelligence — Baseball → Football → Basketball → Track &amp; Field</p>
      <DeveloperModePanel />
      <ul>
        <li>
          <Link href="/dev/ue">UE 5.6 Pixel Streaming</Link>
        </li>
        <li>
          <Link href="/dev/labs">WebGPU Labs</Link>
        </li>
      </ul>
      <p style={{ fontSize: 12, opacity: 0.8 }}>
        Served behind Cloudflare Access. UE proxied under <code>/dev/ue</code>. WebGPU demos run client-side with fallback to
        WebGL.
      </p>
    </main>
  );
}
