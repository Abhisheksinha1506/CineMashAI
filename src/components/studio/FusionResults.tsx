'use client';

import { Download, Share2, Clock, Star, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FusionResult } from '@/types';
import { getMoviePosterUrl } from '@/lib/api/tmdb';

interface FusionResultsProps {
  fusionResult: FusionResult | null;
  onShare: () => void;
  onDownload: () => void;
}

export function FusionResults({ fusionResult, onShare, onDownload }: FusionResultsProps) {
  if (!fusionResult) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-2xl font-bold text-white mb-2">Pick 2–4 movies and smash them together</h3>
          <p className="text-muted-foreground">
            Select your favorite movies from the browser and hit FUSE NOW to create something magical
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Collage Header */}
      <div className="relative mb-8">
        <div className="relative h-64 sm:h-80 rounded-lg overflow-hidden">
          {/* Blended background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20">
            <div className="grid grid-cols-2 sm:grid-cols-4 h-full">
              {fusionResult.sourceMovies.slice(0, 4).map((movie, index) => (
                <div key={movie.id} className="relative overflow-hidden">
                  <img
                    src={getMoviePosterUrl(movie.poster_path, 'w342')}
                    alt={movie.title}
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Overlay with fusion title */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-6">
            <div>
              <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2 neon-text">
                {fusionResult.title}
              </h1>
              <p className="text-lg text-muted-foreground italic">{fusionResult.tagline}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Synopsis */}
        <Card className="glassmorphic border border-white/10">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Synopsis</h3>
            <p className="text-muted-foreground leading-relaxed text-lg">
              {fusionResult.synopsis}
            </p>
          </CardContent>
        </Card>

        {/* Key Scenes */}
        <Card className="glassmorphic border border-white/10">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Key Scenes</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {fusionResult.keyScenes.map((scene, index) => (
                <div key={scene.id} className="flex-shrink-0 w-48">
                  <div className="relative group">
                    <div className="aspect-video bg-muted/20 rounded-lg overflow-hidden">
                      <img
                        src={scene.imageUrl}
                        alt={scene.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        {index + 1}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-white text-sm font-medium line-clamp-1">{scene.title}</h4>
                      <p className="text-muted-foreground text-xs line-clamp-2">{scene.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Suggested Cast */}
        <Card className="glassmorphic border border-white/10">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Suggested Cast</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {fusionResult.suggestedCast.map(cast => (
                <div key={cast.id} className="flex-shrink-0 w-32">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-2 rounded-full overflow-hidden border-2 border-primary/30">
                      <img
                        src={cast.headshotUrl}
                        alt={cast.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="text-white text-sm font-medium">{cast.name}</h4>
                    <p className="text-primary text-xs">{cast.role}</p>
                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{cast.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <Card className="glassmorphic border border-white/10">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-white">{fusionResult.runtime} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span className="text-white">{fusionResult.rating}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-white">{fusionResult.boxOffice}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownload}
                  className="border-white/20 hover:bg-white/10 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShare}
                  className="border-white/20 hover:bg-white/10 text-white"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
