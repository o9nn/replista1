
import { db } from '../../db';
import { orgPersonaExtensions } from '../../../shared/schema';
import { eq, desc } from 'drizzle-orm';

interface LearningEvent {
  type: 'prompt_success' | 'prompt_failure' | 'pattern_identified' | 'preference_learned';
  data: Record<string, any>;
  timestamp: Date;
}

export class PersonaLearningEngine {
  private learningHistory: LearningEvent[] = [];
  private readonly LEARNING_THRESHOLD = 5; // Number of events before updating
  private readonly CONFIDENCE_DECAY = 0.95; // How confidence decays over time

  async recordEvent(orgId: number, event: LearningEvent): Promise<void> {
    this.learningHistory.push(event);

    // Process learning if threshold reached
    if (this.learningHistory.length >= this.LEARNING_THRESHOLD) {
      await this.processLearning(orgId);
      this.learningHistory = [];
    }
  }

  private async processLearning(orgId: number): Promise<void> {
    const patterns = this.identifyPatterns();
    const preferences = this.extractPreferences();
    const insights = this.generateInsights();

    // Get current persona extension
    const [currentExt] = await db
      .select()
      .from(orgPersonaExtensions)
      .where(eq(orgPersonaExtensions.orgId, orgId))
      .orderBy(desc(orgPersonaExtensions.version))
      .limit(1);

    const newVersion = currentExt ? currentExt.version + 1 : 1;
    const currentLearning = currentExt?.learningData || {};
    const currentConfidence = currentExt?.confidenceScore || 0.5;

    // Merge new learning with existing
    const updatedLearning = {
      ...currentLearning,
      patterns: [...(currentLearning.patterns || []), ...patterns],
      preferences: { ...currentLearning.preferences, ...preferences },
      insights: [...(currentLearning.insights || []), ...insights],
      lastUpdated: new Date().toISOString(),
    };

    // Calculate new confidence score
    const newConfidence = this.calculateConfidence(
      currentConfidence,
      this.learningHistory
    );

    // Create new persona extension version
    await db.insert(orgPersonaExtensions).values({
      orgId,
      version: newVersion,
      learningData: updatedLearning,
      confidenceScore: newConfidence,
      evolutionNotes: this.generateEvolutionNotes(patterns, preferences, insights),
    });
  }

  private identifyPatterns(): string[] {
    const patterns: string[] = [];
    const eventsByType = this.groupEventsByType();

    // Identify success patterns
    if (eventsByType.prompt_success?.length >= 3) {
      patterns.push('consistent_prompt_success');
    }

    // Identify failure patterns
    if (eventsByType.prompt_failure?.length >= 2) {
      patterns.push('needs_prompt_refinement');
    }

    // Identify temporal patterns
    const timePatterns = this.analyzeTemporalPatterns();
    patterns.push(...timePatterns);

    return patterns;
  }

  private extractPreferences(): Record<string, any> {
    const preferences: Record<string, any> = {};
    const eventData = this.learningHistory.map(e => e.data);

    // Extract common preferences
    const promptTypes = eventData
      .filter(d => d.promptType)
      .map(d => d.promptType);
    
    if (promptTypes.length > 0) {
      preferences.preferredPromptTypes = this.findMostCommon(promptTypes);
    }

    // Extract interaction style preferences
    const interactionStyles = eventData
      .filter(d => d.interactionStyle)
      .map(d => d.interactionStyle);
    
    if (interactionStyles.length > 0) {
      preferences.preferredInteractionStyle = this.findMostCommon(interactionStyles);
    }

    return preferences;
  }

  private generateInsights(): string[] {
    const insights: string[] = [];
    const successRate = this.calculateSuccessRate();

    if (successRate > 0.8) {
      insights.push('High engagement with current prompts');
    } else if (successRate < 0.5) {
      insights.push('Consider refining prompt strategies');
    }

    // Add temporal insights
    const recentEvents = this.learningHistory.slice(-3);
    if (recentEvents.every(e => e.type === 'prompt_success')) {
      insights.push('Recent consistent success pattern');
    }

    return insights;
  }

  private calculateConfidence(
    currentConfidence: number,
    events: LearningEvent[]
  ): number {
    const successCount = events.filter(e => e.type === 'prompt_success').length;
    const totalCount = events.length;
    const successRate = successCount / totalCount;

    // Weighted average of current confidence and new success rate
    const newConfidence = (currentConfidence * this.CONFIDENCE_DECAY) + 
                         (successRate * (1 - this.CONFIDENCE_DECAY));

    return Math.max(0, Math.min(1, newConfidence));
  }

  private generateEvolutionNotes(
    patterns: string[],
    preferences: Record<string, any>,
    insights: string[]
  ): string {
    const notes = [];

    if (patterns.length > 0) {
      notes.push(`Identified patterns: ${patterns.join(', ')}`);
    }

    if (Object.keys(preferences).length > 0) {
      notes.push(`Updated preferences: ${JSON.stringify(preferences)}`);
    }

    if (insights.length > 0) {
      notes.push(`Insights: ${insights.join('; ')}`);
    }

    return notes.join(' | ');
  }

  private groupEventsByType(): Record<string, LearningEvent[]> {
    return this.learningHistory.reduce((acc, event) => {
      if (!acc[event.type]) {
        acc[event.type] = [];
      }
      acc[event.type].push(event);
      return acc;
    }, {} as Record<string, LearningEvent[]>);
  }

  private analyzeTemporalPatterns(): string[] {
    const patterns: string[] = [];
    const now = new Date();
    const recentEvents = this.learningHistory.filter(e => {
      const timeDiff = now.getTime() - e.timestamp.getTime();
      return timeDiff < 3600000; // Last hour
    });

    if (recentEvents.length > 3) {
      patterns.push('high_recent_activity');
    }

    return patterns;
  }

  private calculateSuccessRate(): number {
    const successCount = this.learningHistory.filter(
      e => e.type === 'prompt_success'
    ).length;
    return this.learningHistory.length > 0 
      ? successCount / this.learningHistory.length 
      : 0;
  }

  private findMostCommon<T>(items: T[]): T | null {
    if (items.length === 0) return null;
    
    const counts = new Map<T, number>();
    for (const item of items) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }

    let maxCount = 0;
    let mostCommon: T | null = null;
    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    }

    return mostCommon;
  }
}
