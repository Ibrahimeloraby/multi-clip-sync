// Application Constants

// Session & Video Limits
export const SESSION_LIMITS = {
  FREE: {
    maxVideos: 5,
    maxDuration: 60, // seconds
    maxParticipants: 3,
    maxStorage: 500 * 1024 * 1024, // 500MB
  },
  PRO: {
    maxVideos: 25,
    maxDuration: 300, // 5 minutes
    maxParticipants: 10,
    maxStorage: 5 * 1024 * 1024 * 1024, // 5GB
  },
  ENTERPRISE: {
    maxVideos: -1, // unlimited
    maxDuration: -1, // unlimited
    maxParticipants: -1, // unlimited
    maxStorage: -1, // unlimited
  },
} as const;

// Zoom Presets
export const ZOOM_PRESETS = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '3x', value: 3 },
] as const;

export const ZOOM_LIMITS = {
  MIN: 0.5,
  MAX: 5,
  DEFAULT: 1,
  PINCH_SENSITIVITY: 0.01,
} as const;

// Video Quality Settings
export const VIDEO_QUALITY = {
  LOW: {
    width: 640,
    height: 480,
    frameRate: 24,
    bitrate: 1000000, // 1 Mbps
  },
  MEDIUM: {
    width: 1280,
    height: 720,
    frameRate: 30,
    bitrate: 2500000, // 2.5 Mbps
  },
  HIGH: {
    width: 1920,
    height: 1080,
    frameRate: 30,
    bitrate: 5000000, // 5 Mbps
  },
  ULTRA: {
    width: 3840,
    height: 2160,
    frameRate: 30,
    bitrate: 15000000, // 15 Mbps
  },
} as const;

// Playback Speed Options
export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

// Filter Effects
export const VIDEO_FILTERS = [
  { id: 'none', label: 'None', filter: '' },
  { id: 'grayscale', label: 'Grayscale', filter: 'grayscale(100%)' },
  { id: 'sepia', label: 'Sepia', filter: 'sepia(100%)' },
  { id: 'vintage', label: 'Vintage', filter: 'sepia(50%) contrast(90%) brightness(90%)' },
  { id: 'warm', label: 'Warm', filter: 'sepia(30%) saturate(140%)' },
  { id: 'cool', label: 'Cool', filter: 'hue-rotate(180deg) saturate(80%)' },
  { id: 'bright', label: 'Bright', filter: 'brightness(130%) contrast(110%)' },
  { id: 'dramatic', label: 'Dramatic', filter: 'contrast(150%) saturate(120%)' },
  { id: 'muted', label: 'Muted', filter: 'saturate(50%) brightness(95%)' },
  { id: 'noir', label: 'Noir', filter: 'grayscale(100%) contrast(130%)' },
] as const;

// Geolocation Settings
export const GEOLOCATION = {
  TIMEOUT: 10000, // 10 seconds
  MAX_AGE: 60000, // 1 minute
  PROXIMITY_RADIUS: 100, // meters
  HIGH_ACCURACY_THRESHOLD: 50, // meters
} as const;

// WebRTC Configuration
export const WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
} as const;

// UI Animation Durations (ms)
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'timecode_preferences',
  DEVICE_ID: 'timecode_device_id',
  LAST_SESSION: 'timecode_last_session',
  CAMERA_SETTINGS: 'timecode_camera_settings',
  THEME: 'timecode_theme',
} as const;

// API Rate Limits
export const RATE_LIMITS = {
  UPLOAD_INTERVAL: 1000, // 1 second between uploads
  FETCH_INTERVAL: 500, // 500ms between fetches
  REALTIME_DEBOUNCE: 100, // 100ms debounce for realtime updates
} as const;

// Social Features
export const SOCIAL = {
  MAX_COMMENT_LENGTH: 500,
  MAX_COMMENTS_PER_VIDEO: 100,
  COMMENTS_PAGE_SIZE: 20,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  CAMERA_ACCESS_DENIED: 'Camera access was denied. Please enable camera permissions.',
  MICROPHONE_ACCESS_DENIED: 'Microphone access was denied. Please enable microphone permissions.',
  LOCATION_ACCESS_DENIED: 'Location access was denied. Some features may be limited.',
  UPLOAD_FAILED: 'Failed to upload video. Please try again.',
  SESSION_NOT_FOUND: 'Session not found or has expired.',
  SESSION_FULL: 'This session has reached its participant limit.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// Time Code Format
export const TIME_CODE_FORMAT = {
  PREFIX: 'TC',
  SEPARATOR: '-',
  RANDOM_LENGTH: 4,
} as const;

// Export types for TypeScript
export type SessionTier = keyof typeof SESSION_LIMITS;
export type VideoQualityLevel = keyof typeof VIDEO_QUALITY;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];
export type VideoFilter = (typeof VIDEO_FILTERS)[number];
