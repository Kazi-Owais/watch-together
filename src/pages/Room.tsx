import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tv, ArrowLeft, Copy, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import ChatSection from '@/components/room/ChatSection';
import InviteFriendsDialog from '@/components/room/InviteFriendsDialog';

interface RoomData {
  id: string;
  name: string;
  invite_code: string;
  video_url: string | null;
  playback_position: number;
  is_playing: boolean;
  created_by: string;
}

interface Participant {
  id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const Room = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    const fetchRoomData = async () => {
      try {
        // Fetch room details
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError) throw roomError;
        setRoom(roomData);
        setVideoUrl(roomData.video_url || '');

        // Fetch participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('room_participants')
          .select(`
            id,
            profiles (
              username,
              avatar_url
            )
          `)
          .eq('room_id', roomId);

        if (participantsError) throw participantsError;
        setParticipants(participantsData || []);

        // Subscribe to room changes for real-time sync
        const channel = supabase
          .channel(`room-${roomId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'rooms',
              filter: `id=eq.${roomId}`,
            },
            (payload) => {
              if (payload.new) {
                setRoom(payload.new as RoomData);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'room_participants',
              filter: `room_id=eq.${roomId}`,
            },
            () => {
              // Refetch participants on change
              fetchParticipants();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error: any) {
        toast.error('Failed to load room');
        console.error('Error fetching room:', error);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('room_participants')
        .select(`
          id,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq('room_id', roomId);

      if (data) setParticipants(data);
    };

    fetchRoomData();
  }, [roomId, navigate]);

  const copyInviteCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.invite_code);
      toast.success('Invite code copied!');
    }
  };

  const convertToEmbedUrl = (url: string): string => {
    // Handle YouTube URLs
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    
    // Return original URL if not YouTube or already an embed URL
    return url;
  };

  const updateVideoUrl = async () => {
    if (!room || !videoUrl.trim()) return;

    try {
      const { error } = await supabase
        .from('rooms')
        .update({ video_url: videoUrl })
        .eq('id', room.id);

      if (error) throw error;
      toast.success('Video URL updated!');
    } catch (error: any) {
      toast.error('Failed to update video URL');
      console.error('Error updating video URL:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse">
          <Tv className="h-16 w-16 text-primary" />
        </div>
      </div>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
                  <Tv className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">{room.name}</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Code: <span className="font-mono font-bold">{room.invite_code}</span></span>
                    <Button variant="ghost" size="sm" onClick={copyInviteCode}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <Button variant="hero" onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Friends
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Area - Left 2/3 */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Video Player</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter video URL (YouTube, Vimeo, etc.)"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                  <Button onClick={updateVideoUrl} variant="hero">
                    Load
                  </Button>
                </div>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  {room.video_url ? (
                    <iframe
                      src={convertToEmbedUrl(room.video_url)}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  ) : (
                    <div className="text-center space-y-2">
                      <Tv className="h-16 w-16 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">No video loaded yet</p>
                      <p className="text-sm text-muted-foreground">Enter a video URL above to start watching</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Participants ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-2 bg-accent/50 rounded-full pl-1 pr-3 py-1">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-white text-xs">
                          {participant.profiles?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {participant.profiles?.username || 'User'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Section - Right 1/3 */}
          <div className="lg:col-span-1">
            <div className="h-[calc(100vh-12rem)] sticky top-24">
              <ChatSection roomId={room.id} />
            </div>
          </div>
        </div>
      </main>

      <InviteFriendsDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        roomId={room.id}
        inviteCode={room.invite_code}
      >
        <Button variant="outline">
          Invite Friends
        </Button>
      </InviteFriendsDialog>
    </div>
  );
};

export default Room;
