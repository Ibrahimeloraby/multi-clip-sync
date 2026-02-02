import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, Plus, Users, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CameraControls from "@/components/CameraControls";
import { JoinSessionModal } from "@/components/SessionModals";
import QuickShare from "@/components/QuickShare";
import LiveMonitorView from "@/components/LiveMonitorView";
import NearbyUsersOverlay from "@/components/NearbyUsersOverlay";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const CameraScreen = () => {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  
  // Session state - unified: once created, session is ready to share & record
  const [currentSession, setCurrentSession] = useState<{ id: string; name: string; timeCode: string; ownerId?: string } | null>(null);
  
  
  // Discovery and nearby sessions state
  // Overlay states
  const [showNearbyUsers, setShowNearbyUsers] = useState(false);
  const [showLiveMonitor, setShowLiveMonitor] = useState(false);
  const [showNearbySessions, setShowNearbySessions] = useState(false);
  const [nearbySessions, setNearbySessions] = useState<Array<{ id: string; name: string; time_code: string; distance: number }>>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [triggerShare, setTriggerShare] = useState(false);
  
  // Check if user is session owner
  const isSessionOwner = currentSession?.ownerId === currentUserId;

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // No recording time limit

  // Initialize anonymous auth on mount
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Sign in anonymously
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error("Anonymous auth error:", error);
          toast.error("Failed to initialize. Please refresh.");
          return;
        }
        
        // Create profile for anonymous user
        if (data.user) {
          const deviceId = crypto.randomUUID();
          const username = `User_${Math.random().toString(36).substring(2, 6)}`;
          
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username,
            device_id: deviceId
          }, { onConflict: 'id' });
          
          setCurrentUserId(data.user.id);
        }
      } else {
        setCurrentUserId(session.user.id);
      }
      
      setIsAuthReady(true);
    };
    
    initAuth();
  }, []);

  // Initialize camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  // Recording timer
  useEffect(() => {
    if (recording) {
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } else if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [recording]);

  const startCamera = async () => {
    try {
      setCameraReady(false);
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Camera not supported on this browser");
        console.error("mediaDevices not available");
        return;
      }
      
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      console.log("Requesting camera access...");
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });

      console.log("Camera access granted, setting up video element...");
      
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });
        
        await videoRef.current.play();
        console.log("Video playing successfully");
      }

      setCameraReady(true);
    } catch (error: any) {
      console.error("Camera error:", error.name, error.message);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error("Camera access denied. Check your browser settings.");
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error("No camera found on this device.");
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        toast.error("Camera is in use by another app.");
      } else if (error.name === 'OverconstrainedError') {
        // Try again with basic constraints
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          setStream(basicStream);
          if (videoRef.current) {
            videoRef.current.srcObject = basicStream;
            videoRef.current.muted = true;
            videoRef.current.playsInline = true;
            await videoRef.current.play();
          }
          setCameraReady(true);
          return;
        } catch {
          toast.error("Camera not compatible.");
        }
      } else {
        toast.error(`Camera error: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  };

  const handleFacingModeChange = (mode: "user" | "environment") => {
    setFacingMode(mode);
  };

  const startRecording = async (sessionToUse?: { id: string; name: string; timeCode: string }) => {
    if (!stream) {
      toast.error("Camera not ready");
      return;
    }

    const session = sessionToUse || currentSession;

    // Auto-create a quick session if none exists
    if (!session) {
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession?.user) {
          toast.error("Not authenticated");
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('device_id')
          .eq('id', authSession.user.id)
          .single();

        const timeCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const sessionName = `My Session`;

        const { data: newSession, error } = await supabase
          .from('sessions')
          .insert({
            owner_id: authSession.user.id,
            name: sessionName,
            time_code: timeCode,
            mode: 'global', // Valid modes: 'global' or 'proximity'
            tier: 'free',
          })
          .select()
          .single();

        if (error) throw error;

        // Add owner as participant
        await supabase.from('session_participants').insert({
          session_id: newSession.id,
          user_id: authSession.user.id,
          device_id: profile?.device_id || 'unknown',
        });

        const createdSession = { id: newSession.id, name: sessionName, timeCode, ownerId: authSession.user.id };
        setCurrentSession(createdSession);
        
        // Now start recording with the new session
        startRecordingWithSession(createdSession);
        return;
      } catch (error) {
        console.error("Auto-create session error:", error);
        toast.error("Failed to create session");
        return;
      }
    }

    startRecordingWithSession(session);
  };

  const startRecordingWithSession = (session: { id: string; name: string; timeCode: string }) => {
    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

      const mediaRecorder = new MediaRecorder(stream!, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // Capture session in closure to avoid stale state
      const capturedSession = session;
      
      mediaRecorder.onstop = async () => {
        console.log("Recording stopped, processing blob...");
        const blob = new Blob(chunksRef.current, { type: mimeType });
        console.log("Blob created, size:", blob.size, "type:", mimeType);
        
        if (blob.size > 1000) {
          console.log("Starting upload for session:", capturedSession.id);
          try {
            // Upload and wait for completion before navigating
            const success = await uploadVideoWithSession(blob, capturedSession);
            if (success) {
              console.log("Upload successful, navigating to videos");
              navigate('/videos');
            } else {
              console.log("Upload returned false, staying on camera");
            }
          } catch (err) {
            console.error("Upload failed in onstop:", err);
            toast.error("Upload failed. Please try again.");
          }
        } else {
          console.log("Blob too small:", blob.size);
          toast.error("Recording too short");
        }
      };

      mediaRecorder.start(1000);
      setRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadVideoWithSession = async (blob: Blob, session: { id: string; name: string; timeCode: string }): Promise<boolean> => {
    setUploading(true);
    console.log("uploadVideoWithSession called for session:", session.id, "blob size:", blob.size);
    
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      console.log("Auth session:", authSession?.user?.id ? "authenticated" : "NOT authenticated");
      
      if (!authSession?.user) {
        toast.error("Not authenticated. Please refresh the app.");
        return false;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('device_id')
        .eq('id', authSession.user.id)
        .single();
      
      console.log("Profile fetched:", profile?.device_id, "error:", profileError);

      // Get video duration with timeout
      const video = document.createElement('video');
      video.preload = 'metadata';
      const duration = await Promise.race([
        new Promise<number>((resolve) => {
          video.onloadedmetadata = () => {
            if (video.duration === Infinity || isNaN(video.duration)) {
              video.currentTime = Number.MAX_SAFE_INTEGER;
              video.ontimeupdate = () => {
                video.ontimeupdate = null;
                resolve(Math.max(1, Math.floor(video.duration)));
              };
            } else {
              resolve(Math.max(1, Math.floor(video.duration)));
            }
          };
          video.onerror = () => resolve(5);
          video.src = URL.createObjectURL(blob);
        }),
        // Fallback timeout after 5 seconds
        new Promise<number>((resolve) => setTimeout(() => resolve(Math.ceil(blob.size / 100000)), 5000))
      ]);
      
      console.log("Video duration calculated:", duration);

      const filePath = `${authSession.user.id}/${session.id}/${Date.now()}-recording.webm`;
      console.log("Uploading to storage path:", filePath);
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, blob);

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        toast.error("Storage upload failed: " + uploadError.message);
        return false;
      }
      
      console.log("Storage upload successful");

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      console.log("Inserting video record into database...");
      const { error: dbError } = await supabase.from('videos').insert({
        session_id: session.id,
        user_id: authSession.user.id,
        device_id: profile?.device_id || 'unknown',
        storage_path: filePath,
        thumbnail_url: publicUrl,
        duration: duration,
      });

      if (dbError) {
        console.error("Database insert error:", dbError);
        toast.error("Database error: " + dbError.message);
        return false;
      }

      console.log("Video uploaded successfully to session:", session.id);
      toast.success("Video uploaded!");
      return true;
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Upload failed");
      return false;
    } finally {
      setUploading(false);
    }
  };

  // Legacy function for file uploads - uses currentSession state
  const uploadVideo = async (blob: Blob) => {
    if (!currentSession) {
      toast.error("No active session");
      return;
    }
    await uploadVideoWithSession(blob, currentSession);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error("Please select a video file");
        return;
      }
      if (!currentSession) {
        toast.error("Create a session first (tap +)");
        return;
      }
      // Upload directly and navigate to videos
      await uploadVideo(file);
      navigate('/videos');
    }
  };

  const handleSessionCreated = async (sessionId: string, timeCode: string, sessionName: string = "New Session") => {
    // Get current user to set as owner
    const { data: { session: authSession } } = await supabase.auth.getSession();
    // Session is immediately active and shareable
    setCurrentSession({ id: sessionId, name: sessionName, timeCode, ownerId: authSession?.user?.id });
    toast.success("Session created!");
  };

  // Quick session creation without modal
  const handleQuickCreateSession = async () => {
    if (currentSession) {
      toast.info("You already have an active session");
      return;
    }

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.user) {
        toast.error("Not authenticated");
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('device_id, username')
        .eq('id', authSession.user.id)
        .single();

      // Generate a short, friendly session name
      const adjectives = ['Epic', 'Cool', 'Fun', 'Live', 'Quick', 'Hot', 'Fresh', 'Wild'];
      const nouns = ['Session', 'Take', 'Shoot', 'Clip', 'Moment', 'Scene'];
      const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
      const sessionName = `${randomAdj} ${randomNoun}`;

      // Generate short time code
      const timeCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert({
          owner_id: authSession.user.id,
          name: sessionName,
          time_code: timeCode,
          mode: 'global',
          tier: 'free',
        })
        .select()
        .single();

      if (error) throw error;

      // Add owner as participant
      await supabase.from('session_participants').insert({
        session_id: newSession.id,
        user_id: authSession.user.id,
        device_id: profile?.device_id || 'unknown',
      });

      setCurrentSession({ 
        id: newSession.id, 
        name: sessionName, 
        timeCode, 
        ownerId: authSession.user.id 
      });
      
      toast.success(`"${sessionName}" created!`);
    } catch (error: any) {
      console.error("Quick create session error:", error);
      toast.error(error.message || "Failed to create session");
    }
  };

  const handleRenameSession = async () => {
    if (!currentSession || !editedName.trim()) {
      setIsEditingName(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ name: editedName.trim() })
        .eq('id', currentSession.id);

      if (error) throw error;

      setCurrentSession({ ...currentSession, name: editedName.trim() });
      setIsEditingName(false);
      toast.success("Session renamed!");
    } catch (error) {
      console.error("Rename error:", error);
      toast.error("Failed to rename session");
    }
  };

  const handleCreateSessionForShare = async (): Promise<{ timeCode: string; sessionName: string } | null> => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.user) {
        toast.error("Not authenticated");
        return null;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('device_id')
        .eq('id', authSession.user.id)
        .single();

      const timeCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const sessionName = `My Session`;

      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert({
          owner_id: authSession.user.id,
          name: sessionName,
          time_code: timeCode,
          mode: 'global', // Valid modes: 'global' or 'proximity'
          tier: 'free',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('session_participants').insert({
        session_id: newSession.id,
        user_id: authSession.user.id,
        device_id: profile?.device_id || 'unknown',
      });

      const createdSession = { id: newSession.id, name: sessionName, timeCode, ownerId: authSession.user.id };
      setCurrentSession(createdSession);
      
      return { timeCode, sessionName };
    } catch (error) {
      console.error("Create session error:", error);
      toast.error("Failed to create session");
      return null;
    }
  };

  // Fetch nearby sessions (within 100m using GPS)
  const fetchNearbySessions = async () => {
    setLoadingNearby(true);
    try {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        toast.error("Location not supported on this device");
        setLoadingNearby(false);
        return;
      }

      // Get user's current location with better error handling for PWA
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout for PWA
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      // Fetch active sessions with location data
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id, name, time_code, latitude, longitude')
        .eq('is_active', true)
        .eq('mode', 'proximity')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;

      // Calculate distance and filter sessions within 100m
      const nearby = (sessions || [])
        .map(session => {
          const distance = calculateDistance(
            latitude,
            longitude,
            session.latitude!,
            session.longitude!
          );
          return { ...session, distance };
        })
        .filter(session => session.distance <= 100)
        .sort((a, b) => a.distance - b.distance);

      setNearbySessions(nearby);
      
      if (nearby.length === 0) {
        toast.info("No nearby sessions found within 100m");
      }
    } catch (error: any) {
      console.error("Failed to fetch nearby sessions:", error);
      
      // Better error handling for geolocation errors
      if (error.code === 1) {
        // PERMISSION_DENIED
        toast.error("Location permission denied. Please enable in your browser/device settings.");
      } else if (error.code === 2) {
        // POSITION_UNAVAILABLE
        toast.error("Location unavailable. Make sure GPS is enabled.");
      } else if (error.code === 3) {
        // TIMEOUT
        toast.error("Location request timed out. Try again.");
      } else {
        toast.error("Failed to get location. Check your settings.");
      }
    } finally {
      setLoadingNearby(false);
    }
  };

  // Haversine formula to calculate distance between two GPS coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const handleShowNearby = () => {
    setShowNearbySessions(true);
    fetchNearbySessions();
  };

  const handleGoLive = () => {
    // Open nearby users overlay to find other TimeCode users
    setShowNearbyUsers(true);
  };

  const handleJoinNearbySession = async (sessionId: string, timeCode: string, sessionName: string) => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.user) {
        toast.error("Not authenticated");
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('device_id')
        .eq('id', authSession.user.id)
        .single();

      // Check if already a participant
      const { data: existing } = await supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', authSession.user.id)
        .single();

      if (!existing) {
        await supabase.from('session_participants').insert({
          session_id: sessionId,
          user_id: authSession.user.id,
          device_id: profile?.device_id || 'unknown',
        });
      }

      setCurrentSession({ id: sessionId, name: sessionName, timeCode, ownerId: undefined }); // Not owner when joining
      setShowNearbySessions(false);
      toast.success(`Joined "${sessionName}"!`);
    } catch (error) {
      console.error("Failed to join session:", error);
      toast.error("Failed to join session");
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Camera Preview */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />

        {/* TimeCode watermark - faded text for authenticity */}
        {recording && (
          <div className="absolute bottom-20 right-4 opacity-30 pointer-events-none safe-area-mr">
            <span className="text-white text-xs font-bold tracking-wider">TIMECODE</span>
          </div>
        )}

        {/* Loading overlay - with retry option after delay */}
        {!cameraReady && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-white/70 text-sm">Starting camera...</p>
            <button
              onClick={() => startCamera()}
              className="mt-4 flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tap to retry
            </button>
          </div>
        )}

        {/* Recording indicator */}
        {recording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive text-white px-3 py-1.5 rounded-full text-sm font-medium safe-area-mt">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            REC {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
          </div>
        )}

        {/* Session indicator - tap to rename */}
        {currentSession && !recording && !isEditingName && (
          <button
            onClick={() => {
              setEditedName(currentSession.name);
              setIsEditingName(true);
            }}
            className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium safe-area-mt hover:bg-black/70 transition-colors"
          >
            📹 {currentSession.name} <span className="text-white/50 ml-1">✎</span>
          </button>
        )}

        {/* Inline rename input */}
        {currentSession && !recording && isEditingName && (
          <div className="absolute top-4 left-4 right-4 safe-area-mt flex gap-2">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSession();
                if (e.key === 'Escape') setIsEditingName(false);
              }}
              autoFocus
              className="flex-1 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium border border-white/20 outline-none"
              placeholder="Session name..."
            />
            <button
              onClick={handleRenameSession}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium"
            >
              Save
            </button>
          </div>
        )}

        {/* Recording time elapsed */}
        {recording && (
          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm safe-area-mt">
            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
          </div>
        )}

        {/* Camera controls (right side) - with safe area for notched devices */}
        {cameraReady && (
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 pr-[env(safe-area-inset-right)] transition-opacity ${recording ? 'opacity-40' : 'opacity-100'}`}>
            <CameraControls
              stream={stream}
              facingMode={facingMode}
              onFacingModeChange={handleFacingModeChange}
              onGoLive={handleGoLive}
              onShowNearby={handleShowNearby}
              onShare={() => setTriggerShare(true)}
              onMonitor={currentSession ? () => {
                if (isSessionOwner) {
                  setShowLiveMonitor(true);
                } else {
                  toast.info("Only the session owner can monitor participants");
                }
              } : undefined}
            />
          </div>
        )}

        {/* Upload indicator */}
        {uploading && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-2" />
              <p>Uploading...</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls - Floating on camera with proper safe area */}
      {!uploading && (
        <div className="absolute bottom-0 left-0 right-0 pb-6 safe-area-pb">
          <div className="flex items-center justify-between px-6">
            {/* Left - Create + Join buttons - larger touch targets */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex gap-3">
                <button
                  onClick={handleQuickCreateSession}
                  disabled={!isAuthReady || !!currentSession}
                  className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-black flex items-center justify-center active:scale-90 active:bg-black/80 transition-all touch-manipulation disabled:opacity-50"
                  aria-label="Create new session"
                >
                  <Plus className="w-6 h-6 text-[#FFFF00]" strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-black flex items-center justify-center active:scale-90 active:bg-black/80 transition-all touch-manipulation"
                  disabled={!isAuthReady}
                  aria-label="Join session"
                >
                  <Users className="w-6 h-6 text-[#FFFF00]" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Center - Record button - larger for easy tapping */}
            <button
              onClick={recording ? stopRecording : () => startRecording()}
              disabled={!cameraReady || !isAuthReady}
              className="relative active:scale-90 transition-all touch-manipulation"
              aria-label={recording ? "Stop recording" : "Start recording"}
            >
              <div className="w-[76px] h-[76px] rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                {recording ? (
                  <div className="w-8 h-8 rounded-md bg-destructive" />
                ) : (
                  <div className="w-[60px] h-[60px] rounded-full bg-destructive" />
                )}
              </div>
            </button>

            {/* Right placeholder for balance */}
            <div className="w-14" />
          </div>
        </div>
      )}

      {/* QuickShare component (hidden button, sheet only) */}
      <QuickShare 
        timeCode={currentSession?.timeCode || ""}
        sessionName={currentSession?.name || "My Session"}
        onNeedSession={handleCreateSessionForShare}
        hasSession={!!currentSession}
        triggerShare={triggerShare}
        onShareTriggered={() => setTriggerShare(false)}
        hideButton
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />


      {/* Join Modal */}
      <JoinSessionModal
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
      />

      {/* Nearby Users Overlay - for Go Live button */}
      {showNearbyUsers && currentUserId && (
        <NearbyUsersOverlay
          userId={currentUserId}
          onClose={() => setShowNearbyUsers(false)}
          onJoinSession={handleJoinNearbySession}
        />
      )}

      {/* Live Monitor View - Owner only with video feeds and locations */}
      {showLiveMonitor && currentSession && currentUserId && (
        <LiveMonitorView
          sessionId={currentSession.id}
          userId={currentUserId}
          localStream={stream}
          onClose={() => setShowLiveMonitor(false)}
        />
      )}

      {/* Nearby Sessions Sheet */}
      <Sheet open={showNearbySessions} onOpenChange={setShowNearbySessions}>
        <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-6 pt-4 max-h-[70vh]">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 justify-center">
              <MapPin className="w-5 h-5 text-primary" />
              Nearby Sessions
            </SheetTitle>
          </SheetHeader>
          
          {loadingNearby ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Finding sessions near you...</p>
            </div>
          ) : nearbySessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No sessions found within 100m</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Create a session or try again later</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-auto max-h-[50vh]">
              {nearbySessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleJoinNearbySession(session.id, session.time_code, session.name)}
                  className="w-full flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors active:scale-[0.98]"
                >
                  <div className="text-left">
                    <p className="font-medium">{session.name}</p>
                    <p className="text-xs text-muted-foreground">Code: {session.time_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">{Math.round(session.distance)}m</p>
                    <p className="text-xs text-muted-foreground">away</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CameraScreen;
