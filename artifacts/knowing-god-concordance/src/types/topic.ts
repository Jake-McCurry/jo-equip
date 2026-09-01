export interface Passage {
  reference: string;
  text: string;
}

export interface Topic {
  id: string;
  title: string;
  definition: string;
  primaryPassages: Passage[];
  supplementalReferences: string[];
  relatedTopics: string[];
  sourcePages: number[];
  sampleStatus: 'complete' | 'cross-reference' | 'partial';
}
