"use client";

const PAGE_URL = "https://www.facebook.com/p/Ponimetsa-tall-61578838420269/";

function encode(str: string) {
  return encodeURIComponent(str);
}

export function FacebookPagePlugin() {
  // Facebook Page Plugin via iframe. This is the simplest/most compatible embed.
  // Note: Some browsers/extensions may still block FB embeds; we keep an external link as fallback in the page.
  const href = encode(PAGE_URL);

  // Using a larger width in the plugin URL helps avoid the narrow look.
  const src =
    `https://www.facebook.com/plugins/page.php?href=${href}` +
    `&tabs=timeline` +
    `&width=500` +
    `&height=900` +
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
        maxWidth: 500,
        height: 900,
        display: "block",
        margin: "0 auto",
      }}
      scrolling="no"
      frameBorder={0}
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}