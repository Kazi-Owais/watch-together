import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface SearchResult {
  id: string;
  username: string;
  avatar_url: string | null;
}

const FriendSearch = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const searchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !user) return;

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchQuery.trim()}%`)
        .neq('id', user.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
      
      if (data?.length === 0) {
        toast.info('No users found');
      }
    } catch (error: any) {
      toast.error('Failed to search users');
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const addFriend = async (friendId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friends')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'pending') {
          toast.info('Friend request already sent');
        } else if (existing.status === 'accepted') {
          toast.info('Already friends');
        }
        return;
      }

      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'accepted', // Auto-accept for simplicity
        });

      if (error) throw error;

      // Also create reverse friendship
      await supabase
        .from('friends')
        .insert({
          user_id: friendId,
          friend_id: user.id,
          status: 'accepted',
        });

      toast.success('Friend added!');
      setSearchResults(prev => prev.filter(u => u.id !== friendId));
    } catch (error: any) {
      toast.error('Failed to add friend');
      console.error('Error adding friend:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <form onSubmit={searchUsers} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={searching || !searchQuery.trim()}>
            {searching ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={result.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-white">
                      {result.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{result.username}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => addFriend(result.id)}
                  disabled={loading}
                  variant="hero"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FriendSearch;
