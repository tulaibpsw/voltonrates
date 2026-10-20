import type { MetadataRoute } from "next";

// Installable app. Opens on the admin page, because the owner mostly uses it from his iPhone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/admin",
    name: "Volt On Live Rates",
    short_name: "Volt On Rates",
    description: "Change solar rates and send notices to the Volt On office screen.",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#07111f",
    theme_color: "#0c1a2b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Send a notice", url: "/admin?tab=notice", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Open the rates screen", url: "/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
