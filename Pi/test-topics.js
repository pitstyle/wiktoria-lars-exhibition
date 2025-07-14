// Test topic extraction patterns
function extractTopicFromTranscript(messages) {
  if (!messages || !Array.isArray(messages)) return null;

  // Look for user responses that indicate topic interest
  for (const message of messages) {
    if (message.role === 'MESSAGE_ROLE_USER' && message.text) {
      const text = message.text.toLowerCase();
      
      // Look for topic patterns in Polish
      const topicPatterns = [
        /chcę (?:rozmawiać|porozmawiać|dyskutować) (?:o|na temat|właśnie o) (.+?)(?:\.|$|,|\?)/i,
        /porozmawiać (?:właśnie )?o (.+?)(?:\.|$|,|\?)/i,
        /interesuje mnie (.+?)(?:\.|$|,|\?)/i,
        /temat[^:]*:?\s*(.+?)(?:\.|$|,|\?)/i,
        /(?:o|na temat) (.+?)(?:\.|$|,|\?)/i,
        /mówić o (.+?)(?:\.|$|,|\?)/i,
        /problemie (.+?)(?:\.|$|,|\?)/i,
        /zajmuję się (.+?)(?:\.|$|,|\?)/i
      ];
      
      for (const pattern of topicPatterns) {
        const match = message.text.match(pattern);
        if (match && match[1]) {
          const topic = match[1].trim();
          // Filter out generic responses
          if (topic.length > 3 && 
              !topic.includes('nie wiem') && 
              !topic.includes('wszystko') &&
              !topic.includes('tego') &&
              topic.length < 100) {
            return topic;
          }
        }
      }
    }
  }
  return null;
}

// Test cases from actual conversations
const testCases = [
  {
    name: "Miś - Bee Problem",
    text: "No dobra, dobra. Siema Szlars. Wszystko rozumiem. Mam na imię Miś. Zajmuję się miodem. Pszczoły hoduje. Chcę porozmawiać właśnie o problemie wyginania pszczół, umierania pszczół lat 37.",
    expected: "problemie wyginania pszczół"
  },
  {
    name: "Johnny - GigaSet", 
    text: "Słuchaj, jestem przewoźnikiem danych. Mam lat 40 I chcę porozmawiać o Giga Set.",
    expected: "Giga Set"
  }
];

console.log("Testing topic extraction patterns:");
console.log("=====================================");

testCases.forEach(testCase => {
  const message = { role: 'MESSAGE_ROLE_USER', text: testCase.text };
  const result = extractTopicFromTranscript([message]);
  
  console.log(`\nTest: ${testCase.name}`);
  console.log(`Input: "${testCase.text}"`);
  console.log(`Expected: "${testCase.expected}"`);
  console.log(`Result: "${result}"`);
  console.log(`Status: ${result ? '✅ EXTRACTED' : '❌ FAILED'}`);
  
  if (result && result.toLowerCase().includes(testCase.expected.toLowerCase().split(' ')[0])) {
    console.log(`Match: ✅ Contains expected topic`);
  } else {
    console.log(`Match: ❌ Does not match expected`);
  }
});