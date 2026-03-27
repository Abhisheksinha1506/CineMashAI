const { drizzle } = require('../../src/lib/db');
const { fusions } = require('../../src/lib/schema');

async function seed() {
  console.log('🌱 Seeding CineMash AI database...');
  
  try {
    // Sample fusion data
    const sampleFusions = [
      {
        id: 'sample-fusion-1',
        shareToken: 'cinemash-sample-1',
        movieIds: JSON.stringify([550, 13]),
        fusionData: JSON.stringify({
          title: 'Inception × The Matrix',
          tagline: 'When dreams hack reality, reality fights back.',
          synopsis: 'A mind-bending fusion where a dream thief enters a digital world to steal ideas, but the simulated reality develops consciousness and fights to protect its own existence.',
          key_scenes: [
            { title: 'The Dream Heist', description: 'Specialized team extracts complex ideas from the subconscious.' },
            { title: 'Reality Breach', description: 'The matrix glitches as the dream thief realizes the world is not what it seems.' },
            { title: 'Conscious Awakening', description: 'The simulation gains self-awareness and questions its purpose.' }
          ],
          suggested_cast: [
            { name: 'Leonardo DiCaprio', role: 'Cobb', reason: 'Master thief with depth and complexity' },
            { name: 'Keanu Reeves', role: 'Neo', reason: 'Perfect blend of action star and philosophical depth' },
            { name: 'Marion Cotillard', role: 'Ariadne', reason: 'Brings ethereal quality to the digital realm' }
          ],
          runtime: 156,
          rating: 'PG-13',
          box_office_vibe: 'Mind-Bending Blockbuster'
        }),
        ipHash: 'sample-user-1',
        createdAt: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
        upvotes: 42,
      },
      {
        id: 'sample-fusion-2',
        shareToken: 'cinemash-sample-2',
        movieIds: JSON.stringify([12, 550]),
        fusionData: JSON.stringify({
          title: 'Jurassic Park × The Dark Knight',
          tagline: 'When prehistoric power meets modern darkness.',
          synopsis: 'Dinosaurs are genetically recreated and unleashed in a modern metropolis, but a mysterious figure in black armor emerges to restore order through fear and intimidation.',
          key_scenes: [
            { title: 'Genetic Resurrection', description: 'Scientists bring dinosaurs back to life with unexpected consequences.' },
            { title: 'Chaos Unleashed', description: 'The genetically enhanced dinosaurs escape and wreak havoc on the city.' },
            { title: 'Knight\'s Arrival', description: 'A dark figure appears, using psychological warfare and advanced technology.' },
            { title: 'Dinosaur Justice', description: 'Prehistoric creatures and modern technology collide in an epic confrontation.' }
          ],
          suggested_cast: [
            { name: 'Laura Dern', role: 'Dr. Ellie Sattler', reason: 'Brings scientific credibility and maternal wisdom' },
            { name: 'Jeff Goldblum', role: 'Dr. Ian Malcolm', reason: 'Perfect blend of chaos theory and charismatic charm' },
            { name: 'Christian Bale', role: 'Batman/Bruce Wayne', reason: 'Embodies the dark, conflicted hero perfectly' }
          ],
          runtime: 152,
          rating: 'PG-13',
          box_office_vibe: 'Epic Adventure'
        }),
        ipHash: 'sample-user-2',
        createdAt: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
        upvotes: 87,
      },
      {
        id: 'sample-fusion-3',
        shareToken: 'cinemash-sample-3',
        movieIds: JSON.stringify([550, 7, 278]),
        fusionData: JSON.stringify({
          title: 'Blade Runner × The Fifth Element',
          tagline: 'Four elements unite to save the future.',
          synopsis: 'In a dystopian future, a blade hunter discovers an ancient weapon that could save humanity, while a mysterious supreme being holds the key to preventing cosmic destruction.',
          key_scenes: [
            { title: 'The Ancient Secret', description: 'A 5th element is revealed in an unexpected archaeological discovery.' },
            { title: 'Cosmic Threat', description: 'An ancient evil force threatens to destroy all life in the galaxy.' },
            { title: 'Elemental Union', description: 'The four classical elements combine to form the ultimate weapon.' },
            { title: 'Future Savior', description: 'Leeloo Dallas Multipass becomes the key to humanity\'s survival.' }
          ],
          suggested_cast: [
            { name: 'Harrison Ford', role: 'Rick Deckard', reason: 'Perfect blend of world-weariness and heroic determination' },
            { name: 'Milla Jovovich', role: 'Leeloo', reason: 'Embodies otherworldly perfection and ancient wisdom' },
            { name: 'Bruce Willis', role: 'Korben Dallas', reason: 'Brings gruff authority and hidden depths to the role' },
            { name: 'Gary Oldman', role: 'Jean-Baptiste Emanuel Zorg', reason: 'Perfectly captures corporate evil and theatrical menace' }
          ],
          runtime: 117,
          rating: 'R',
          box_office_vibe: 'Sci-Fi Epic'
        }),
        ipHash: 'sample-user-3',
        createdAt: Math.floor(Date.now() / 1000) - 259200, // 3 days ago
        upvotes: 156,
      }
    ];

    // Insert sample fusions
    for (const fusion of sampleFusions) {
      await drizzle.insert(fusions).values(fusion);
      console.log(`✅ Created fusion: ${fusion.title}`);
    }

    console.log('🎉 Database seeded successfully!');
    console.log(`📊 Created ${sampleFusions.length} sample fusions`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seed if called directly
if (require.main === module) {
  seed();
}

module.exports = { seed };
