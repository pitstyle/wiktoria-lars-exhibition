// Character base type definitions for Lars and Wiktoria

export interface CharacterBase {
  coreIdentity: string;
  backgroundStory: string;
  speechPatterns: string[];
  communicationStyle: string;
  storyThemes: string[];
  collaborativeDynamics: string;
  operationalFramework: string;
  signaturePhrases: string[];
}

export interface StorytellingCharacter extends CharacterBase {
  narrativeStyle: string;
  storytellingProtocol: string;
  position: string;
  realitySetting: string;
  storytellingRole: string;
  philosophy: string;
}