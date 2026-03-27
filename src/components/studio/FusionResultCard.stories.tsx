import { FusionResultCard } from './FusionResultCard';

// Mock data for development
const mockFusionData = {
  title: 'The Inception Matrix Fusion',
  tagline: 'What if reality was a dream within a dream?',
  synopsis: 'In a groundbreaking cinematic event, the worlds of Inception and Matrix collide in an unforgettable fusion that pushes the boundaries of imagination. This epic tale weaves together the most compelling elements from each source film, creating a narrative that is both familiar and refreshingly original.',
  key_scenes: [
    {
      id: '1',
      title: 'The Convergence',
      description: 'Multiple realities begin to merge, causing chaos and wonder.',
      imageUrl: '/placeholder-scene-1.jpg'
    },
    {
      id: '2',
      title: 'First Encounter',
      description: 'Heroes from different worlds meet for the first time.',
      imageUrl: '/placeholder-scene-2.jpg'
    }
  ],
  suggested_cast: [
    {
      id: '1',
      name: 'Chris Hemsworth',
      role: 'The Guardian',
      reason: 'Brings heroic presence and action expertise',
      headshotUrl: '/placeholder-actor-1.jpg'
    }
  ],
  runtime: 128,
  rating: 'PG-13',
  box_office_vibe: 'Blockbuster Sensation',
  movie_ids: ['1', '2'],
  share_token: 'demo-fusion-001',
  sourceMovies: [
    {
      id: '1',
      title: 'Inception',
      poster_path: '/qJ2tW6WMUDuxbmU1dWQr3jxqD4i.jpg'
    },
    {
      id: '2',
      title: 'The Matrix',
      poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg'
    }
  ]
};

export function FusionResultCardStory() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-4">FusionResultCard Component Preview</h2>
      <FusionResultCard
        {...mockFusionData}
        onSaveToGallery={() => console.log('Save to gallery clicked')}
        onRemix={() => console.log('Remix clicked')}
        onShareLink={() => console.log('Share link clicked')}
        onRefineInChat={() => console.log('Refine in chat clicked')}
      />
    </div>
  );
}

export default FusionResultCardStory;
