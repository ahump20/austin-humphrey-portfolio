import React, { useEffect, useState } from "react";

type Flags = {
  "engine.mode"?: "ue" | "webgpu";
  codec?: "h264" | "av1";
  bitrate?: string;
  resolution?: string;
  region?: string;
};

const DEFAULT_FLAGS: Required<Pick<Flags, "engine.mode" | "codec" | "bitrate" | "resolution" | "region">> = {
  "engine.mode": "webgpu",
  codec: "h264",
  bitrate: "12",
  resolution: "1920x1080",
  region: "us-central",
};

export default function DeveloperModePanel(): JSX.Element {
  const [flags, setFlags] = useState<Flags>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/flags")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load flags: ${response.status}`);
        }
        return (await response.json()) as Flags;
      })
      .then((remoteFlags) => {
        if (isMounted) {
          setFlags(remoteFlags);
        }
      })
      .catch(() => {
        // rely on defaults rendered below
      })
      .finally(() => {
        if (isMounted) {
          setLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const applyFlag = <K extends keyof Flags>(key: K, value: Flags[K]) => {
    setFlags((previous) => ({ ...previous, [key]: value }));
  };

  const mergedFlags: Required<typeof DEFAULT_FLAGS> = {
    ...DEFAULT_FLAGS,
    ...flags,
  };

  return (
    <div style={{ border: "1px solid #444", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <h2 style={{ marginTop: 0 }}>Developer Mode Controls</h2>
      {!loaded && <p>Loading flags…</p>}
      <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8 }}>
        <label htmlFor="engine-mode">Engine</label>
        <select
          id="engine-mode"
          value={mergedFlags["engine.mode"]}
          onChange={(event) => applyFlag("engine.mode", event.target.value as Flags["engine.mode"])}
        >
          <option value="webgpu">WebGPU</option>
          <option value="ue">UE (Pixel Streaming)</option>
        </select>

        <label htmlFor="codec">Codec</label>
        <select
          id="codec"
          value={mergedFlags.codec}
          onChange={(event) => applyFlag("codec", event.target.value as Flags["codec"])}
        >
          <option value="h264">H.264</option>
          <option value="av1">AV1</option>
        </select>

        <label htmlFor="resolution">Resolution</label>
        <select
          id="resolution"
          value={mergedFlags.resolution}
          onChange={(event) => applyFlag("resolution", event.target.value)}
        >
          <option value="1280x720">1280x720</option>
          <option value="1920x1080">1920x1080</option>
          <option value="2560x1440">2560x1440</option>
        </select>

        <label htmlFor="bitrate">Bitrate (Mbps)</label>
        <input
          id="bitrate"
          value={mergedFlags.bitrate}
          onChange={(event) => applyFlag("bitrate", event.target.value)}
        />

        <label htmlFor="region">Region</label>
        <input id="region" value={mergedFlags.region} onChange={(event) => applyFlag("region", event.target.value)} />
      </div>
      <p style={{ fontSize: 12, opacity: 0.8, marginTop: 12 }}>
        Flags come from Cloudflare KV via the Worker /api/flags. Adjust here for client demo; persist via KV UI later.
      </p>
    </div>
  );
}
