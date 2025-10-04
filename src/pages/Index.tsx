import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tv, Users, Video, Sparkles, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import heroImage from '@/assets/hero-bg.jpg';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

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
      // Find room by invite code
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('invite_code', inviteCode.trim())
        .single();

      if (roomError || !room) {
        toast.error('Invalid invite code');
        return;
      }

      // Check if already a participant
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      if (!existingParticipant) {
        // Add user as participant
        const { error: participantError } = await supabase
          .from('room_participants')
          .insert({
            room_id: room.id,
            user_id: user.id,
          });

        if (participantError) throw participantError;
      }

      toast.success('Joined room successfully!');
      navigate(`/room/${room.id}`);
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    } finally {
      setJoiningRoom(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/10 to-accent/10">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-[var(--shadow-glow)]">
                <Tv className="h-12 w-12 text-white" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
              PartyWatch 🎉
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
              Watch videos together with friends, perfectly synchronized. Create a room, invite your crew, and enjoy the show together - no matter where you are!
            </p>
            
            <div className="flex flex-col gap-6 items-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  variant="hero"
                  onClick={() => navigate('/auth')}
                  className="text-lg px-8 py-6"
                >
                  Get Started
                  <Sparkles className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="glass"
                  onClick={() => navigate('/auth')}
                  className="text-lg px-8 py-6"
                >
                  Sign In
                </Button>
              </div>
              
              <div className="w-full max-w-md">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Enter invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                    className="text-center sm:text-left text-lg h-12"
                    maxLength={8}
                  />
                  <Button 
                    size="lg"
                    onClick={handleJoinRoom}
                    disabled={joiningRoom}
                    className="h-12 px-6"
                  >
                    {joiningRoom ? (
                      <div className="animate-spin">⏳</div>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-5 w-5" />
                        Join Room
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why PartyWatch?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center space-y-4 p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-primary/10 hover:border-primary/30 transition-all hover:shadow-[var(--shadow-card)]">
              <div className="p-4 rounded-xl bg-primary/10 w-fit mx-auto">
                <Video className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Synchronized Playback</h3>
              <p className="text-muted-foreground">
                Watch videos in perfect sync with all your friends. One person controls, everyone watches together.
              </p>
            </div>
            
            <div className="text-center space-y-4 p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-primary/10 hover:border-primary/30 transition-all hover:shadow-[var(--shadow-card)]">
              <div className="p-4 rounded-xl bg-accent/10 w-fit mx-auto">
                <Users className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold">Private Rooms</h3>
              <p className="text-muted-foreground">
                Create private watch parties with unique invite codes. Only your friends can join your room.
              </p>
            </div>
            
            <div className="text-center space-y-4 p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-primary/10 hover:border-primary/30 transition-all hover:shadow-[var(--shadow-card)]">
              <div className="p-4 rounded-xl bg-primary-glow/10 w-fit mx-auto">
                <Sparkles className="h-8 w-8 text-primary-glow" />
              </div>
              <h3 className="text-xl font-bold">Easy to Use</h3>
              <p className="text-muted-foreground">
                Create a room in seconds, share the invite code, and start watching. It's that simple!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6 p-12 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to start watching together?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of people enjoying videos with friends around the world.
            </p>
            <Button 
              size="lg" 
              variant="hero"
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-6"
            >
              Create Your First Room
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
