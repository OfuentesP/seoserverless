export const categorizeRecommendations = (opportunities) => {
  const recommendations = {
    critical: [],
    important: [],
    moderate: []
  };

  opportunities.forEach(opp => {
    if (opp.score < 0.5) {
      recommendations.critical.push({
        title: opp.title,
        description: opp.description
      });
    } else if (opp.score < 0.8) {
      recommendations.important.push({
        title: opp.title,
        description: opp.description
      });
    } else {
      recommendations.moderate.push({
        title: opp.title,
        description: opp.description
      });
    }
  });

  return recommendations;
}; 