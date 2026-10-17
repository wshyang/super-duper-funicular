/**
 * Wraps traced path data in a standalone SVG. The silhouette is a real vector
 * clip; the photographic texture is embedded beside it, so the file can be
 * opened on its own, dropped into an editor, or drawn at any scale.
 */
export function svgDocument(d: string, width: number, height: number, imageHref: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<defs><clipPath id="shape"><path d="${d}" fill-rule="evenodd"/></clipPath></defs>`,
    `<g clip-path="url(#shape)">`,
    `<image x="0" y="0" width="${width}" height="${height}" href="${imageHref}"/>`,
    `</g>`,
    `</svg>`,
    "",
  ].join("\n");
}
