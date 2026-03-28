import { searchPerson, getMoviePosterUrl } from './tmdb-simple';

interface AICastMember {
  name: string;
  role: string;
  why_fit: string;
}

interface EnrichedCastMember extends AICastMember {
  headshotUrl: string;
}

/**
 * Enriches a list of AI-suggested cast members with real TMDb headshots.
 * Performs a search for each actor and picks the best match's profile_path.
 * 
 * Optimization: First checks if the actor exists in the provided source actorPool.
 */
export async function enrichCastWithPhotos(
  cast: AICastMember[], 
  actorPool: Array<{ name: string; profile_path: string | null }> = []
): Promise<EnrichedCastMember[]> {
  const enrichmentPromises = cast.map(async (member) => {
    try {
      let headshotUrl = '';

      // 1. Check actorPool for an instant match (case-insensitive)
      const poolMatch = actorPool.find(
        (a) => a.name.toLowerCase() === member.name.toLowerCase() && a.profile_path
      );

      if (poolMatch && poolMatch.profile_path) {
        headshotUrl = getMoviePosterUrl(poolMatch.profile_path, 'w185');
        return {
          ...member,
          headshotUrl
        };
      }

      // 2. Fallback: Search for the person on TMDb (if not in pool or pool was empty)
      const searchResult = await searchPerson(member.name);
      
      if (searchResult.results && searchResult.results.length > 0) {
        // Take the first result that has a profile_path
        const bestMatch = searchResult.results.find((p: any) => p.profile_path);
        if (bestMatch) {
          headshotUrl = getMoviePosterUrl(bestMatch.profile_path, 'w185');
        }
      }
      
      return {
        ...member,
        headshotUrl: headshotUrl || '' // UI handles empty string with placeholder
      };
    } catch (error) {
      console.error(`Error enriching cast member ${member.name}:`, error);
      return {
        ...member,
        headshotUrl: ''
      };
    }
  });

  return Promise.all(enrichmentPromises);
}
