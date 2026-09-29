import React, { useState, useEffect } from 'react';
import Celebration from '../Celebration/Celebration';
import ResultsPanel from '../ResultsPanel/ResultsPanel';
import { gameAudio } from '../utils/audio';

interface VictoryModalProps {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  victoryData?: any;
  onRestart: () => void;
  onHome: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  score,
  totalQuestions,
  correctAnswers,
  wrongAnswers,
  victoryData,
  onRestart,
  onHome,
}) => {
  const [showCelebration, setShowCelebration] = useState(
    totalQuestions > 0 && correctAnswers / totalQuestions > 0.5
  );

  const handleRestart = () => {
    gameAudio.playCorrect();
    onRestart();
  };

  const handleHome = () => {
    gameAudio.playCorrect();
    onHome();
  };

  if (showCelebration) {
    // Show celebration and wait for it to finish
    return (
      <div className="fixed inset-0 z-50 pointer-events-none">
        <Celebration 
          isVisible={true} 
          onComplete={() => setShowCelebration(false)} 
        />
      </div>
    );
  }

  // After celebration (or if skipped), show ResultsPanel
  const finalScore = victoryData?.score ?? score;
  const totalScore = totalQuestions * 10;
  const coins = correctAnswers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <ResultsPanel
        score={finalScore}
        totalScore={totalScore}
        correctAnswers={correctAnswers}
        wrongAnswers={wrongAnswers}
        coins={coins}
        totalQuestions={totalQuestions}
        onRetry={handleRestart}
        onBack={handleHome}
      />
    </div>
  );
};
