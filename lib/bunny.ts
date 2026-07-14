/**
 * Bunny Stream configuration (public identifiers — not secrets).
 * libraryId + host come from the Stream library's "API access information".
 * Each video is referenced by its GUID (the per-video ID).
 */
export const BUNNY = {
  libraryId: "704454",
  host: "vz-da9d131d-3ff.b-cdn.net",
};

export const bunnyEmbedUrl = (guid: string) =>
  `https://iframe.mediadelivery.net/embed/${BUNNY.libraryId}/${guid}`;

export const bunnyThumb = (guid: string) =>
  `https://${BUNNY.host}/${guid}/thumbnail.jpg`;
