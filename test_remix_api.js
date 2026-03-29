// Test script to verify remix functionality
const testRemixAPI = async () => {
  try {
    console.log('🧪 Testing Remix API functionality...\n');
    
    // Test 1: Create a new fusion
    console.log('1️⃣ Creating a new fusion...');
    const createResponse = await fetch('http://localhost:3000/api/fuse-simple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieIds: [550, 13] })
    });
    
    const fusionResult = await createResponse.json();
    
    if (fusionResult.success) {
      console.log('✅ Fusion created successfully!');
      console.log(`📝 Share Token: ${fusionResult.data.share_token}`);
      console.log(`🎬 Source Movies: ${fusionResult.data.sourceMovies?.length || 0} movies found`);
      
      if (fusionResult.data.sourceMovies && fusionResult.data.sourceMovies.length > 0) {
        console.log('🎥 Movies:', fusionResult.data.sourceMovies.map(m => m.title).join(' + '));
      }
      
      // Test 2: Get the fusion for remix
      console.log('\n2️⃣ Testing remix API...');
      const remixResponse = await fetch(`http://localhost:3000/api/fusion/${fusionResult.data.share_token}`);
      const remixResult = await remixResponse.json();
      
      if (remixResult.success) {
        console.log('✅ Remix API working!');
        console.log(`📝 Fusion ID: ${remixResult.data.id}`);
        console.log(`🎬 Source Movies: ${remixResult.data.sourceMovies?.length || 0} movies found`);
        
        if (remixResult.data.sourceMovies && remixResult.data.sourceMovies.length > 0) {
          console.log('🎥 Movies:', remixResult.data.sourceMovies.map(m => m.title).join(' + '));
          console.log('🎯 Remix functionality is FIXED! ✨');
        } else {
          console.log('❌ No source movies found in remix response');
        }
      } else {
        console.log('❌ Remix API failed:', remixResult.error);
      }
      
      // Test 3: Test with an existing fusion (backward compatibility)
      console.log('\n3️⃣ Testing backward compatibility...');
      console.log('📝 Note: This tests with existing fusions that might not have source_movies column');
      
      // Test the specific fusion we created earlier
      const testToken = '781048c8-a323-470b-bf5e-68410a229f3e';
      const existingResponse = await fetch(`http://localhost:3000/api/fusion/${testToken}`);
      const existingResult = await existingResponse.json();
      
      if (existingResult.success) {
        console.log(`✅ Existing fusion found!`);
        console.log(`🎬 Source Movies: ${existingResult.data.sourceMovies?.length || 0} movies found`);
        
        if (existingResult.data.sourceMovies && existingResult.data.sourceMovies.length > 0) {
          console.log('🎥 Movies:', existingResult.data.sourceMovies.map(m => m.title).join(' + '));
          console.log('🔄 Backward compatibility working! ✨');
        } else {
          console.log('📦 Using fallback logic for existing fusions');
        }
      } else {
        console.log('ℹ️ Existing fusion not found (expected for new setup)');
      }
      
    } else {
      console.log('❌ Fusion creation failed:', fusionResult.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testRemixAPI();
