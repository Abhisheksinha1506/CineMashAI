'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Fusion, FusionVote } from '@/lib/schema';

// Cache for initial gallery data
let galleryCache: { data: Fusion[]; timestamp: number } | null = null;
const GALLERY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for initial vote data
let voteCache: { [key: string]: { data: { up: number; down: number }; timestamp: number } } = {};
const VOTE_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export function useRealtimeVotes(fusionId?: string) {
  const [votes, setVotes] = useState<{ up: number; down: number }>({ up: 0, down: 0 });

  useEffect(() => {
    if (!fusionId) return;

    // Check cache first
    const cached = voteCache[fusionId];
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < VOTE_CACHE_TTL) {
      setVotes(cached.data);
    } else {
      // Initial vote count
      const fetchInitialVotes = async () => {
        try {
          const { data, error } = await supabase
            .from('fusion_votes')
            .select('vote_type')
            .eq('fusion_id', fusionId);

          if (error) throw error;

          const voteCounts = data?.reduce((acc, vote) => {
            acc[vote.vote_type as 'up' | 'down']++;
            return acc;
          }, { up: 0, down: 0 });

          // Cache the result
          voteCache[fusionId] = {
            data: voteCounts,
            timestamp: now
          };

          setVotes(voteCounts);
        } catch (error) {
          console.error('Error fetching initial votes:', error);
        }
      };

      fetchInitialVotes();
    }

    // Listen for real-time vote updates
    const channel = supabase
      .channel(`votes-${fusionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fusion_votes',
          filter: `fusion_id=eq.${fusionId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newVote = payload.new as FusionVote;
            setVotes(prev => ({
              ...prev,
              [newVote.vote_type]: prev[newVote.vote_type as 'up' | 'down'] + 1
            }));
            
            // Update cache
            if (voteCache[fusionId]) {
              voteCache[fusionId] = {
                data: {
                  ...voteCache[fusionId].data,
                  [newVote.vote_type]: voteCache[fusionId].data[newVote.vote_type as 'up' | 'down'] + 1
                },
                timestamp: now
              };
            }
          } else if (payload.eventType === 'DELETE') {
            const oldVote = payload.old as FusionVote;
            setVotes(prev => ({
              ...prev,
              [oldVote.vote_type]: Math.max(0, prev[oldVote.vote_type as 'up' | 'down'] - 1)
            }));
            
            // Update cache
            if (voteCache[fusionId]) {
              voteCache[fusionId] = {
                data: {
                  ...voteCache[fusionId].data,
                  [oldVote.vote_type]: Math.max(0, voteCache[fusionId].data[oldVote.vote_type as 'up' | 'down'] - 1)
                },
                timestamp: now
              };
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fusionId]);

  return votes;
}

export function useRealtimeGallery() {
  const [fusions, setFusions] = useState<Fusion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check cache first
    const now = Date.now();
    
    if (galleryCache && (now - galleryCache.timestamp) < GALLERY_CACHE_TTL) {
      setFusions(galleryCache.data);
      setLoading(false);
    } else {
      // Initial gallery fetch
      const fetchInitialGallery = async () => {
        try {
          const { data, error } = await supabase
            .from('fusions')
            .select('*')
            .order('upvotes', { ascending: false })
            .limit(20);

          if (error) throw error;
          
          // Cache the result
          galleryCache = {
            data: data || [],
            timestamp: now
          };
          
          setFusions(data || []);
        } catch (error) {
          console.error('Error fetching initial gallery:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchInitialGallery();
    }

    // Listen for real-time fusion updates
    const channel = supabase
      .channel('gallery')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fusions'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newFusion = payload.new as Fusion;
            setFusions(prev => {
              const updated = [newFusion, ...prev.slice(0, 19)];
              
              // Update cache
              if (galleryCache) {
                galleryCache = {
                  data: updated,
                  timestamp: now
                };
              }
              
              return updated;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedFusion = payload.new as Fusion;
            setFusions(prev => {
              const updated = prev.map(f => f.id === updatedFusion.id ? updatedFusion : f);
              
              // Update cache
              if (galleryCache) {
                galleryCache = {
                  data: updated,
                  timestamp: now
                };
              }
              
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedFusion = payload.old as Fusion;
            setFusions(prev => {
              const updated = prev.filter(f => f.id !== deletedFusion.id);
              
              // Update cache
              if (galleryCache) {
                galleryCache = {
                  data: updated,
                  timestamp: now
                };
              }
              
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Function to invalidate cache
  const invalidateCache = () => {
    galleryCache = null;
    voteCache = {};
  };

  return { fusions, loading, invalidateCache };
}

// Export cache utilities for external cache invalidation
export const realtimeCacheUtils = {
  invalidateGallery: () => {
    galleryCache = null;
  },
  invalidateVotes: (fusionId?: string) => {
    if (fusionId) {
      delete voteCache[fusionId];
    } else {
      voteCache = {};
    }
  },
  clearAllCaches: () => {
    galleryCache = null;
    voteCache = {};
  },
  getCacheStats: () => ({
    galleryCached: !!galleryCache,
    galleryCacheAge: galleryCache ? Date.now() - galleryCache.timestamp : 0,
    voteCacheSize: Object.keys(voteCache).length,
    voteCacheEntries: Object.entries(voteCache).map(([id, cache]) => ({
      id,
      age: Date.now() - cache.timestamp,
      ttl: VOTE_CACHE_TTL
    }))
  })
};
