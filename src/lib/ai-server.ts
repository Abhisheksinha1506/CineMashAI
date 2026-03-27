import { AIResponse, FusionResult } from '@/types';
import crypto from 'crypto';
import { getMovieCredits, getMoviePosterUrl } from '@/lib/tmdb-simple';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callChatAI(prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;
  const apiUrl = process.env.GROQ_API_KEY ? GROQ_API_URL : OPENROUTER_API_URL;
  const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'openai/gpt-4o-mini';

  if (!apiKey) {
    throw new Error('No AI API key configured (GROQ_API_KEY or OPENROUTER_API_KEY)');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'CineMash AI',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`AI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function generateFusionImage(
  movie1Title: string,
  movie2Title: string,
  movie1Description: string,
  movie2Description: string
): Promise<AIResponse> {
  const prompt = `Cinematic movie poster fusing "${movie1Title}" and "${movie2Title}". STYLE: High-concept, dramatic lighting.`;
  
  return {
    image_url: `https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1000&auto=format&fit=crop`, 
    revised_prompt: prompt,
  };
}

export async function generateFusionDetails(
  movies: { title: string; overview: string; id?: string }[]
): Promise<Omit<FusionResult, 'id' | 'posterUrl'>> {
  const movieIds = movies.map(m => m.id || '').filter(Boolean);

  // Fetch credits for all source movies
  const creditsList = await Promise.all(
    movieIds.map(id => getMovieCredits(id))
  );

  // Flatten and filter cast to top 15 from each movie to keep prompt size manageable
  const availableActors = creditsList.flatMap((credits, idx) => 
    (credits.cast || []).slice(0, 15).map((actor: any) => ({
      name: actor.name,
      original_movie: movies[idx].title,
      id: actor.id,
      profile_path: actor.profile_path
    }))
  );

  const systemPrompt = `You are a visionary film director. conceptualize a "Fusion Movie" that combines the themes of the provided films.
  
  CASTING RULE: You MUST assign the "Dream Cast" using ONLY the actors provided in the "Available Actors" list. 
  Map each character you create to one of these specific actors. Show the entire fusion cast (at least 6-8 main roles).

  Output ONLY a JSON object:
  {
    "title": "A creative title",
    "tagline": "A catchy tagline",
    "synopsis": "detailed synopsis",
    "keyScenes": [{"title": "Scene Name", "description": "visual scene"}],
    "suggestedCast": [
      { 
        "name": "Exact Name of Actor from list", 
        "role": "Fusion Character Role", 
        "reason": "Why they fit this new role",
        "actorId": "The ID of the actor from the list"
      }
    ]
  }`;

  const userPrompt = `Source Movies: 
  ${movies.map((m, i) => `${i+1}. ${m.title}: ${m.overview}`).join('\n\n')}
  
  Available Actors:
  ${JSON.stringify(availableActors)}

  Create the ultimate fusion and assign the dream cast from the list above.`;

  try {
    const aiResponse = await callChatAI(userPrompt, systemPrompt);
    const result = JSON.parse(aiResponse);

    // Map AI suggested cast back to TMDB profiling
    const refinedCast = result.suggestedCast.map((c: any, i: number) => {
      const originalActor = availableActors.find(a => a.name === c.name || a.id.toString() === c.actorId?.toString());
      return {
        ...c,
        id: originalActor?.id?.toString() || (i + 1).toString(),
        headshotUrl: originalActor?.profile_path 
          ? getMoviePosterUrl(originalActor.profile_path, 'h632') 
          : `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop`
      };
    });

    return {
      ...result,
      movie_ids: movieIds,
      sourceMovies: movies as any,
      keyScenes: result.keyScenes.map((s: any, i: number) => ({
        ...s,
        id: (i + 1).toString(),
        imageUrl: `https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=800&auto=format&fit=crop`
      })),
      suggestedCast: refinedCast,
      // Provide defaults for removed fields to satisfy TypeScript until components are updated
      runtime: 0,
      rating: 'N/A',
      boxOffice: '0',
      box_office_vibe: ''
    };
  } catch (error) {
    console.error('AI generation failed:', error);
    throw error;
  }
}

export async function refineFusion(
  existingFusionData: any,
  refinementMessage: string
): Promise<any> {
  const systemPrompt = `You are a visionary film director refining a movie fusion.
  Output ONLY a JSON object with the exact same structure as the input, but updated based on the user's request.
  Maintain cinematic quality.
  
  User Request: "${refinementMessage}"`;

  try {
    const aiResponse = await callChatAI(
      `Current Fusion Data: ${JSON.stringify(existingFusionData)}\n\nRefine this fusion based on: "${refinementMessage}"`, 
      systemPrompt
    );
    return JSON.parse(aiResponse);
  } catch (error) {
    console.error('AI refinement failed:', error);
    throw error;
  }
}

export function generateShareToken(): string {
  return crypto.randomUUID();
}
