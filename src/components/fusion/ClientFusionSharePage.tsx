'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Share2, Sparkles, Calendar, Clock, Film } from 'lucide-react';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface ClientFusionSharePageProps {
  initialData: {
    success: boolean;
    data: any;
    error: string | null;
  };
  shareToken: string;
}

export default function ClientFusionSharePage({ initialData, shareToken }: ClientFusionSharePageProps) {
  const [fusion, setFusion] = useState(initialData.success ? initialData.data : null);
  const [loading, setLoading] = useState(!initialData.success);
  const [error, setError] = useState(initialData.error);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (initialData.success) {
      setFusion(initialData.data);
      setLoading(false);
    }
  }, [initialData]);

  const handleVote = async () => {
    if (isVoted || isVoting) return;
    
    setIsVoting(true);
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken: shareToken,
          voteType: 'up'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setFusion((prev: any) => prev ? { ...prev, upvotes: result.data.newUpvotes } : null);
        setHasVoted(true);
      }
    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: fusion?.fusionData?.title || 'CineMash AI Fusion',
          text: `Check out this amazing fusion: ${fusion?.fusionData?.title}`,
          url: window.location.href
        });
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    // Could add toast notification here
  };

  const isVoted = hasVoted;

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading cinematic masterpiece...</p>
        </div>
      </div>
    );
  }

  if (error || !fusion) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
            <Film className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold">Fusion Not Found</h2>
          <p className="text-muted-foreground">{error || 'This fusion could not be found.'}</p>
          <Link href="/gallery">
            <Button>Browse Gallery</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid lg:grid-cols-3 gap-8"
        >
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <Link 
                href="/gallery" 
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                ← Back to Gallery
              </Link>
              
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h1 className="text-4xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 tracking-[-0.05em] uppercase">
                    {fusion.fusionData?.title || 'Untitled Fusion'}
                  </h1>
                  {fusion.fusionData?.tagline && (
                    <p className="text-xl text-muted-foreground italic">
                      "{fusion.fusionData.tagline}"
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {fusion.upvotes || 0}
                  </Badge>
                  <Badge variant="outline">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(fusion.createdAt).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Movie Grid */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Film className="w-6 h-6" />
                Source Movies
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {fusion.movieIds?.slice(0, 4).map((movieId: number, index: number) => (
                  <motion.div
                    key={movieId}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative group cursor-pointer"
                  >
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10">
                      <img
                        src={getMoviePosterUrl(`placeholder-movie-${index + 1}`)}
                        alt={`Movie ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-xs font-bold truncate">
                          Movie {index + 1}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Synopsis */}
            {fusion.fusionData?.synopsis && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Synopsis</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {fusion.fusionData.synopsis}
                </p>
              </div>
            )}

            {/* Key Scenes */}
            {fusion.fusionData?.key_scenes && fusion.fusionData.key_scenes.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Key Scenes</h2>
                <div className="space-y-4">
                  {fusion.fusionData.key_scenes.map((scene: any, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-white/10"
                    >
                      <h3 className="font-bold text-primary mb-2">
                        {scene.title || `Scene ${index + 1}`}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {scene.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Cast */}
            {fusion.fusionData?.suggested_cast && fusion.fusionData.suggested_cast.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Suggested Cast</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {fusion.fusionData.suggested_cast.slice(0, 6).map((cast: any, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-white/10"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold">{cast.name}</p>
                        <p className="text-xs text-muted-foreground">{cast.role}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <Button
                onClick={handleVote}
                disabled={isVoted || isVoting}
                className="w-full"
                variant={isVoted ? "secondary" : "default"}
              >
                <Heart className={`w-4 h-4 ${isVoted ? 'fill-current' : ''}`} />
                {isVoted ? 'Voted' : 'Vote'}
                {fusion.upvotes > 0 && ` (${fusion.upvotes})`}
              </Button>
              
              <Button
                onClick={handleShare}
                variant="outline"
                className="w-full"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              
              <Link href="/studio" className="w-full">
                <Button variant="outline" className="w-full">
                  Create Your Own
                </Button>
              </Link>
            </motion.div>

            {/* Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4 p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-white/10"
            >
              <h3 className="font-bold">Fusion Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(fusion.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Votes</span>
                  <span>{fusion.upvotes || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Runtime</span>
                  <span>{fusion.fusionData?.runtime || 'TBD'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rating</span>
                  <span>{fusion.fusionData?.rating || 'TBD'}</span>
                </div>
              </div>
            </motion.div>

            {/* Share Token */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-white/10"
            >
              <h3 className="font-bold mb-2">Share Token</h3>
              <code className="text-xs text-muted-foreground break-all">
                {shareToken}
              </code>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
