import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Celebration from '../Celebration/Celebration';
import ResultsPanel from '../ResultsPanel/ResultsPanel';
import { gameAudio } from '../utils/audio';

interface VictoryModalProps {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  isSubmitting?: boolean;
  victoryData?: any;
  onRestart: () => void;
  onHome: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  score,
  totalQuestions,
  correctAnswers,
  wrongAnswers,
  isSubmitting,
  victoryData,
  onRestart,
  onHome,
}) => {
  const [showCelebration, setShowCelebration] = useState(correctAnswers > 0);

  const handleRestart = () => {
    gameAudio.playCorrect();
    onRestart();
  };

  const handleHome = () => {
    gameAudio.playCorrect();
    onHome();
  };

  if (isSubmitting) {
    return (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div className="glass-panel w-full max-w-md md:max-w-xl lg:max-w-2xl p-8 md:p-12 text-center border-[#00f0ff] relative overflow-hidden flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px]">
          <Loader2 className="w-16 h-16 md:w-24 md:h-24 text-[#00f0ff] animate-spin mb-4" />
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-white text-glow-cyan animate-pulse">
            جاري حفظ إنجازاتك...
          </h2>
          <p className="text-gray-400 mt-2 md:text-xl">أنت بطل !</p>
        </div>
      </div>
    );
  }

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
  const coins = victoryData?.coins ?? (correctAnswers * 5); // Example fallback for coins

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <ResultsPanel
        score={finalScore}
        totalScore={totalScore}
        correctAnswers={correctAnswers}
        wrongAnswers={wrongAnswers}
        coins={coins}
        onRetry={handleRestart}
        onBack={handleHome}
      />
    </div>
  );
};
