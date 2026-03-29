import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { generateFusion } from '../src/lib/groq';

async function test() {
  console.log('🎬 Starting AI logic verification...');
  const mockMovies: any[] = [
    { id: '27205', title: 'Inception', overview: 'A thief who steals corporate secrets through the use of dream-sharing technology...' },
    { id: '157336', title: 'Interstellar', overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole...' }
  ];

  try {
    const fusion = await generateFusion(mockMovies);
    console.log('✅ Fusion Generated Successfully!');
    console.log('Title:', fusion.fusionData.title);
    console.log('Tagline:', fusion.fusionData.tagline);
    console.log('Scenes count:', fusion.fusionData.key_scenes.length);
    console.log('Cast count:', fusion.fusionData.suggestedCast.length);
    console.log('Box Office Vibe:', fusion.fusionData.box_office_vibe);
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

test();
