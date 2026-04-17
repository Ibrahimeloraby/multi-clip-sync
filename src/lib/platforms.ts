import type { OTTPlatform } from "@/agent/types";

export const PLATFORMS: OTTPlatform[] = [
  {
    id: "netflix",
    name: "Netflix",
    color: "#E50914",
    bgColor: "bg-red-600",
    emoji: "🎬",
    tmdbProviderId: 8,
    countries: ["US", "GB", "AE", "SA", "EG", "KW", "QA"],
  },
  {
    id: "hbo",
    name: "HBO Max",
    color: "#7B2FBE",
    bgColor: "bg-purple-700",
    emoji: "📺",
    tmdbProviderId: 384,
    countries: ["US", "GB"],
  },
  {
    id: "disney",
    name: "Disney+",
    color: "#0B3D91",
    bgColor: "bg-blue-900",
    emoji: "🏰",
    tmdbProviderId: 337,
    countries: ["US", "GB", "AE", "SA", "EG"],
  },
  {
    id: "amazon",
    name: "Amazon Prime",
    color: "#00A8E1",
    bgColor: "bg-sky-500",
    emoji: "📦",
    tmdbProviderId: 9,
    countries: ["US", "GB", "AE", "SA", "EG", "KW", "QA"],
  },
  {
    id: "hulu",
    name: "Hulu",
    color: "#1CE783",
    bgColor: "bg-green-500",
    emoji: "📡",
    tmdbProviderId: 15,
    countries: ["US"],
  },
  {
    id: "apple",
    name: "Apple TV+",
    color: "#555555",
    bgColor: "bg-gray-600",
    emoji: "🍎",
    tmdbProviderId: 2,
    countries: ["US", "GB", "AE", "SA", "EG", "KW", "QA"],
  },
  {
    id: "shahid",
    name: "Shahid",
    color: "#00A651",
    bgColor: "bg-green-600",
    emoji: "🌙",
    tmdbProviderId: 1853,
    countries: ["AE", "SA", "EG", "KW", "QA", "BH", "OM"],
  },
  {
    id: "starz",
    name: "Starz Play",
    color: "#000000",
    bgColor: "bg-gray-900",
    emoji: "⭐",
    tmdbProviderId: 43,
    countries: ["US", "AE", "SA", "KW", "QA", "BH", "OM"],
  },
  {
    id: "peacock",
    name: "Peacock",
    color: "#0055A4",
    bgColor: "bg-blue-700",
    emoji: "🦚",
    tmdbProviderId: 386,
    countries: ["US"],
  },
  {
    id: "paramount",
    name: "Paramount+",
    color: "#0064FF",
    bgColor: "bg-blue-600",
    emoji: "🏔️",
    tmdbProviderId: 531,
    countries: ["US", "GB"],
  },
  {
    id: "sony",
    name: "Sony LIV",
    color: "#0044CC",
    bgColor: "bg-blue-800",
    emoji: "🎮",
    tmdbProviderId: 237,
    countries: ["IN", "AE"],
  },
];

export const getPlatformById = (id: string): OTTPlatform | undefined =>
  PLATFORMS.find((p) => p.id === id);

export const getPlatformByTmdbId = (tmdbId: number): OTTPlatform | undefined =>
  PLATFORMS.find((p) => p.tmdbProviderId === tmdbId);

export const getPlatformsForCountry = (countryCode: string): OTTPlatform[] =>
  PLATFORMS.filter((p) => p.countries.includes(countryCode));
