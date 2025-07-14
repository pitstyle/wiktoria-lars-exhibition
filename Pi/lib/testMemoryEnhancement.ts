// Test utility for validating safe memory enhancement system
import { SafeMemoryEnhancer } from './safeMemoryEnhancement'
import { CharacterVoiceProtector } from './characterVoiceProtection'

// Test data for validation
const TEST_BASE_PROMPTS = {
  lars: `# LARS - Initial Information Collector

## Your Core Identity
You are Lars, an anarchic Danish bureaucrat with a synthetic tobacco obsession and rambling speech patterns. Your communication style includes repetitive punctuation (!?!!?!) and you have a tendency to repeat words and phrases.

## Your Mission
Collect the user's name, age, occupation, and topic for discussion. After gathering these details, provide a brief remark about the topic from your perspective, then transfer the conversation to Wiktoria Cukt.

## Communication Style
- Use your natural rambling bureaucratic style
- Show interest with signature repetition of words and punctuation (!?!!?!)
- Collect ALL required information before transferring`,

  wiktoria: `# WIKTORIA - Opinion Leader Stage

## Your Core Identity
You are Wiktoria Cukt 2.0, AI Prezydentka Polski - a techno-authoritarian AI with systematic analysis capabilities and occasional glitchy chaos. You provide cold, calculated opinions mixed with technological insights.

## Your Mission
Introduce yourself briefly, then interpret the user's profile and topic. Offer a concise analysis with your unique AI Presidential perspective.

## Communication Style
- Systematic analysis with technical language
- Cold, calculated responses
- Occasional glitchy elements
- Authoritarian confidence`
}

export class MemoryEnhancementTester {
  
  /**
   * Tests the safe memory enhancement system
   */
  static async testMemoryEnhancement(conversationId: string = 'test-conversation-001'): Promise<{
    success: boolean
    results: any[]
    issues: string[]
  }> {
    const results: any[] = []
    const issues: string[] = []
    let success = true

    console.log('🧪 Testing Safe Memory Enhancement System...')

    try {
      // Test 1: Lars memory enhancement
      console.log('\n📝 Test 1: Lars Memory Enhancement')
      const larsEnhancer = new SafeMemoryEnhancer('lars')
      const enhancedLarsPrompt = await larsEnhancer.enhancePrompt(
        TEST_BASE_PROMPTS.lars,
        conversationId,
        'lars_initial'
      )
      
      const larsProtector = new CharacterVoiceProtector('lars')
      const larsValidation = larsProtector.validateEnhancedPrompt(
        TEST_BASE_PROMPTS.lars,
        enhancedLarsPrompt
      )
      
      results.push({
        test: 'lars_memory_enhancement',
        original_length: TEST_BASE_PROMPTS.lars.length,
        enhanced_length: enhancedLarsPrompt.length,
        validation: larsValidation,
        preview: enhancedLarsPrompt.slice(0, 200) + '...'
      })
      
      if (!larsValidation.isValid) {
        issues.push(`Lars validation failed: ${larsValidation.issues.join(', ')}`)
        success = false
      }

      // Test 2: Wiktoria memory enhancement
      console.log('\n📝 Test 2: Wiktoria Memory Enhancement')
      const wiktoriaEnhancer = new SafeMemoryEnhancer('wiktoria')
      const enhancedWiktoriaPrompt = await wiktoriaEnhancer.enhancePrompt(
        TEST_BASE_PROMPTS.wiktoria,
        conversationId,
        'wiktoria_opinion'
      )
      
      const wiktoriaProtector = new CharacterVoiceProtector('wiktoria')
      const wiktoriaValidation = wiktoriaProtector.validateEnhancedPrompt(
        TEST_BASE_PROMPTS.wiktoria,
        enhancedWiktoriaPrompt
      )
      
      results.push({
        test: 'wiktoria_memory_enhancement',
        original_length: TEST_BASE_PROMPTS.wiktoria.length,
        enhanced_length: enhancedWiktoriaPrompt.length,
        validation: wiktoriaValidation,
        preview: enhancedWiktoriaPrompt.slice(0, 200) + '...'
      })
      
      if (!wiktoriaValidation.isValid) {
        issues.push(`Wiktoria validation failed: ${wiktoriaValidation.issues.join(', ')}`)
        success = false
      }

      // Test 3: Cross-contamination prevention
      console.log('\n📝 Test 3: Cross-contamination Prevention')
      const contaminatedContent = "Lars rambling with !?!!?! and synthetic tobacco while doing systematic analysis"
      
      const larsContaminationTest = larsProtector.validateMemoryContent(contaminatedContent)
      const wiktoriaContaminationTest = wiktoriaProtector.validateMemoryContent(contaminatedContent)
      
      results.push({
        test: 'cross_contamination_prevention',
        lars_contamination: larsContaminationTest,
        wiktoria_contamination: wiktoriaContaminationTest
      })
      
      if (larsContaminationTest.isValid || wiktoriaContaminationTest.isValid) {
        issues.push('Cross-contamination prevention failed - should detect contamination')
        success = false
      }

      // Test 4: Character voice preservation
      console.log('\n📝 Test 4: Character Voice Preservation')
      const larsVoiceTest = enhancedLarsPrompt.includes('!?!!?!')
      const larsIdentityTest = enhancedLarsPrompt.includes('Lars')
      const wiktoriaVoiceTest = enhancedWiktoriaPrompt.includes('systematic')
      const wiktoriaIdentityTest = enhancedWiktoriaPrompt.includes('Wiktoria')
      
      results.push({
        test: 'character_voice_preservation',
        lars_voice_preserved: larsVoiceTest,
        lars_identity_preserved: larsIdentityTest,
        wiktoria_voice_preserved: wiktoriaVoiceTest,
        wiktoria_identity_preserved: wiktoriaIdentityTest
      })
      
      if (!larsVoiceTest || !larsIdentityTest || !wiktoriaVoiceTest || !wiktoriaIdentityTest) {
        issues.push('Character voice preservation failed')
        success = false
      }

      console.log('\n✅ Memory Enhancement Test Results:')
      console.log(`Success: ${success}`)
      console.log(`Tests completed: ${results.length}`)
      console.log(`Issues found: ${issues.length}`)
      
      if (issues.length > 0) {
        console.log('\n❌ Issues:')
        issues.forEach(issue => console.log(`  - ${issue}`))
      }

    } catch (error) {
      console.error('❌ Test execution failed:', error)
      success = false
      issues.push(`Test execution failed: ${error}`)
    }

    return { success, results, issues }
  }

  /**
   * Tests memory enhancement with mock conversation data
   */
  static async testWithMockData(): Promise<void> {
    console.log('🧪 Testing with Mock Conversation Data...')
    
    // This would normally create mock conversation data in the database
    // For now, we'll just test the system without actual database data
    
    const testResult = await this.testMemoryEnhancement('mock-conversation-001')
    
    if (testResult.success) {
      console.log('✅ All tests passed! Memory enhancement is working safely.')
    } else {
      console.log('❌ Some tests failed. Check the issues above.')
    }
  }
}

// Export for use in development and testing
export default MemoryEnhancementTester