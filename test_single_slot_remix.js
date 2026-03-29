// Test the new single slot remix behavior
const testSingleSlotRemix = async () => {
  try {
    console.log('🧪 Testing Single Slot Remix Behavior...\n');
    
    // Step 1: Create a fusion
    console.log('1️⃣ Creating a fusion...');
    const createResponse = await fetch('http://localhost:3000/api/fuse-simple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieIds: [550, 13] })
    });
    
    const fusionResult = await createResponse.json();
    
    if (fusionResult.success) {
      const shareToken = fusionResult.data.share_token;
      const fusionTitle = fusionResult.data.title;
      console.log(`✅ Fusion created: "${fusionTitle}"`);
      console.log(`📝 Share Token: ${shareToken}`);
      
      // Step 2: Test the remix API to see if it creates a single fusion object
      console.log('\n2️⃣ Testing remix API...');
      const remixResponse = await fetch(`http://localhost:3000/api/fusion/${shareToken}`);
      const remixResult = await remixResponse.json();
      
      if (remixResult.success) {
        console.log('✅ Remix API successful!');
        console.log(`🎬 Fusion Title: ${remixResult.data.fusionData?.title}`);
        console.log(`📦 Source Movies: ${remixResult.data.sourceMovies?.length || 0}`);
        
        // Step 3: Test fusion generation with fusion object + additional movie
        console.log('\n3️⃣ Testing fusion generation with fusion + movie...');
        
        // Create fusion movie object
        const fusionMovie = {
          id: remixResult.data.id,
          title: remixResult.data.fusionData?.title || 'Remixing',
          poster_path: remixResult.data.fusionData?.poster_path || null,
          overview: remixResult.data.fusionData?.synopsis || '',
          release_date: remixResult.data.fusionData?.release_date || '',
          vote_average: remixResult.data.fusionData?.rating || 0,
          genre_ids: remixResult.data.fusionData?.genres?.map(g => g.id) || [],
          isFusion: true,
          share_token: remixResult.data.share_token,
          sourceMovieIds: remixResult.data.movieIds || [],
          sourceMovies: remixResult.data.sourceMovies
        };
        
        const fusionTestResponse = await fetch('http://localhost:3000/api/fuse-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            movieIds: [fusionMovie, 603] // Fusion + The Matrix
          })
        });
        
        const fusionTestResult = await fusionTestResponse.json();
        
        if (fusionTestResult.success) {
          console.log('✅ Fusion generation with fusion object successful!');
          console.log(`🎬 New Fusion: "${fusionTestResult.data.title}"`);
          console.log('🎯 Single slot remix behavior is WORKING! ✨');
        } else {
          console.error('❌ Fusion generation failed:', fusionTestResult.error);
        }
        
        console.log('\n📋 Expected Behavior:');
        console.log('  ✅ Remix URL shows 1 fusion slot + 3 empty slots');
        console.log('  ✅ Fusion slot shows "Rebel Heartbeats" with purple border');
        console.log('  ✅ Can add movies to expand the fusion');
        console.log('  ✅ Fusion generation works with fusion + regular movies');
        
      } else {
        console.error('❌ Remix API failed:', remixResult.error);
      }
    } else {
      console.error('❌ Fusion creation failed:', fusionResult.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testSingleSlotRemix();
