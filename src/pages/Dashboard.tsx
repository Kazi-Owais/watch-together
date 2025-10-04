import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tv, Plus, LogOut, Users, Clock, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CreateRoomDialog from '@/components/CreateRoomDialog';
import FriendSearch from '@/components/dashboard/FriendSearch';
import { toast } from 'sonner';

interface Room {
  id: string;
  name: string;
  created_at: string;
  invite_code: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);
  const navigate = useNavigate();

  const fetchRooms = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          id,
          name,
          created_at,
          invite_code,
          profiles!rooms_created_by_fkey (
            username,
            avatar_url
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (error: any) {
      toast.error('Failed to load rooms');
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [user]);

  const handleRoomCreated = () => {
    fetchRooms();
    setShowCreateDialog(false);
  };

  const handleJoinRoom = async () => {
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    if (!user) {
      toast.error('Please sign in to join a room');
      navigate('/auth');
      return;
    }

    setJoiningRoom(true);
    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('invite_code', inviteCode.trim())
        .single();

      if (roomError || !room) {
        toast.error('Invalid invite code');
        return;
      }

      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      if (!existingParticipant) {
        const { error: joinError } = await supabase
          .from('room_participants')
          .insert({ room_id: room.id, user_id: user.id });

        if (joinError) throw joinError;
      }

      toast.success('Joined room successfully!');
      navigate(`/room/${room.id}`);
    } catch (error: any) {
      toast.error('Failed to join room');
      console.error('Error joining room:', error);
    } finally {
      setJoiningRoom(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
              <Tv className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              PartyWatch
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:block">
              <FriendSearch />
            </div>
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary text-white">
                  {user?.user_metadata?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium hidden sm:inline">{user?.user_metadata?.username || 'User'}</span>
            </div>
            <Button onClick={signOut} variant="ghost">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold">
              Welcome back, {user?.user_metadata?.username}! 🎉
            </h2>
            <p className="text-muted-foreground text-lg">
              Create a room and start watching with friends
            </p>
          </div>

          {/* Actions */}
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button onClick={() => setShowCreateDialog(true)} size="lg" variant="hero">
                <Plus className="mr-2 h-5 w-5" />
                Create New Room
              </Button>
            </div>
            
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-lg">Join a Room</CardTitle>
                <CardDescription>Enter an invite code to join an existing room</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                  />
                  <Button onClick={handleJoinRoom} disabled={joiningRoom}>
                    {joiningRoom ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        Join
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <div className="lg:hidden">
              <FriendSearch />
            </div>
          </div>

          {/* Rooms Grid */}
          <div>
            <h3 className="text-2xl font-bold mb-4">Your Rooms</h3>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Tv className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No rooms yet. Create your first one!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room) => (
                  <Card
                    key={room.id}
                    className="hover:shadow-[var(--shadow-glow)] transition-all cursor-pointer"
                    onClick={() => navigate(`/room/${room.id}`)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Tv className="h-5 w-5 text-primary" />
                        {room.name}
                      </CardTitle>
                      <CardDescription>
                        Code: <span className="font-mono font-bold">{room.invite_code}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(room.created_at).toLocaleDateString()}
                        </div>
                        <Button variant="ghost" size="sm">
                          <Users className="h-4 w-4 mr-1" />
                          Join
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <CreateRoomDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        onRoomCreated={handleRoomCreated}
      />
    </div>
  );
};

export default Dashboard;
