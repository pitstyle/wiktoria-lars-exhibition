// Script to fix existing conversation topics
const fetch = require('node:fetch');

async function fixTopics() {
  try {
    console.log('🎯 Fixing topics for existing conversations...');
    
    const response = await fetch('http://localhost:3000/api/extractTopics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        updateAll: true
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Topic extraction completed!');
      console.log('Summary:', result.summary);
      
      console.log('\nResults:');
      result.results.forEach(r => {
        console.log(`- ${r.userName || 'Unknown'} (${r.callId}): "${r.oldTopic}" → "${r.newTopic || 'No topic found'}" [${r.status}]`);
      });
    } else {
      console.error('❌ Topic extraction failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixTopics();