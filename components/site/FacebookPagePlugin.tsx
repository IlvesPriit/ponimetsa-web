"use client";
import { useEffect, useState } from "react";

const PAGE_URL = "https://www.facebook.com/p/Ponimetsa-tall-61578838420269/";

function encode(str: string) {
  return encodeURIComponent(str);
}

export function FacebookPagePlugin() {
  // Facebook Page Plugin via iframe. This is the simplest/most compatible embed.
  // Note: Some browsers/extensions may still block FB embeds; we keep an external link as fallback in the page.
  const [pluginWidth, setPluginWidth] = useState(500);
  const [pluginHeight, setPluginHeight] = useState(900);

  useEffect(() => {
    function updateSize() {
      const viewportWidth = window.innerWidth;
      const isMobile = viewportWidth < 640;

      // Keep some padding so the Facebook embed does not get clipped on phones.
      const nextWidth = Math.min(500, Math.max(280, viewportWidth - (isMobile ? 56 : 96)));
      const nextHeight = isMobile ? 760 : 900;

      setPluginWidth(nextWidth);
      setPluginHeight(nextHeight);
    }

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const href = encode(PAGE_URL);

  const src =
    `https://www.facebook.com/plugins/page.php?href=${href}` +
    `&tabs=timeline` +
    `&width=${pluginWidth}` +
    `&height=${pluginHeight}` +
    `&small_header=false` +
    `&adapt_container_width=true` +
    `&hide_cover=false` +
    `&show_facepile=true`;

  return (
    <iframe
      title="Ponimetsa Tall Facebook feed"
      src={src}
      style={{
        border: "none",
        width: "100%",
        maxWidth: pluginWidth,
        height: pluginHeight,
        display: "block",
        margin: "0 auto",
        overflow: "hidden",
        background: "white",
      }}
      scrolling="no"
      frameBorder={0}
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}