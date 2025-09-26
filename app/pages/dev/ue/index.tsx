import React, { useEffect } from "react";

export default function UEEntry(): JSX.Element {
  useEffect(() => {
    // Worker maps /dev/ue/* -> upstream root. Hook progress UI here if desired.
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1>UE Pixel Streaming</h1>
      <p>
        This route is reverse-proxied to the UE Frontend by the Cloudflare Worker. If you see this text, the upstream may not
        be reachable yet. Once deployed, navigating subpaths like <code>/dev/ue/</code> should load UE.
      </p>
    </main>
  );
}
