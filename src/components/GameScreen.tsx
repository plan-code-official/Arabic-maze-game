import React, { useState, useEffect, useRef } from 'react';
import { Heart, ArrowLeft, Volume2, Music, Target } from 'lucide-react';
import { MazeCanvas } from './MazeCanvas';
import type { Question } from '../data/questions';

interface GameScreenProps {
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  lives: number;
  onCorrectAnswer: () => void;
  onWrongAnswer: (word: string) => void;
  onLoseLife: () => void;
  onBackToWelcome: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  questions,
  currentQuestionIndex,
  score,
  lives,
  onCorrectAnswer,
  onWrongAnswer,
  onLoseLife,
  onBackToWelcome,
}) => {
  const currentQuestion = questions[currentQuestionIndex];

  // Distribute correct word + 3 distractors randomly
  // To keep it persistent for this question, we memoize it or generate it once.
  // We can use a simple seeded shuffle based on currentQuestionIndex, or state.
  // Using state is simple: when currentQuestionIndex changes, we generate a shuffled array of words.
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [lastIndex, setLastIndex] = useState<number>(-1);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    if (currentQuestion?.audioUrl) {
      const timer = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.log('Autoplay prevented:', e));
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentQuestionIndex, currentQuestion?.audioUrl]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Play prevented:', e));
    }
  };

  // Touch pad external direction input
  const extDir = null;

  if (lastIndex !== currentQuestionIndex && currentQuestion) {
    const allWords = [currentQuestion.word, ...currentQuestion.distractors];
    // Simple random shuffle
    for (let i = allWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
    }
    setShuffledWords(allWords);
    setLastIndex(currentQuestionIndex);
  }

  const triggerNotification = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 2000);
  };

  const handleWrong = (word: string) => {
    onWrongAnswer(word);
    triggerNotification('خطأ', 'error');
  };

  const handleCorrect = () => {
    triggerNotification('أحسنت', 'success');
    onCorrectAnswer();
  };

  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < 3; i++) {
      hearts.push(
        <Heart
          key={i}
          className={`w-6 h-6 transition-all duration-300 ${i < lives
            ? 'text-[#ff007f] fill-[#ff007f] filter drop-shadow-[0_0_5px_rgba(255,0,127,0.7)]'
            : 'text-gray-600 fill-transparent'
            }`}
        />
      );
    }
    return <div className="flex gap-1">{hearts}</div>;
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start gap-4 lg:gap-8 h-auto overflow-y-auto lg:h-screen lg:overflow-hidden">

      {/* 1. Header panel */}
      <div className="glass-panel w-full flex items-center justify-between px-[32px] py-[24px] relative z-10">
        <button
          onClick={onBackToWelcome}
          className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
        >
          <ArrowLeft className="w-4 h-4 ml-1 p-2" />
          الرئيسية
        </button>

        {/* HUD Info */}
        <div className="flex items-center gap-6">
          {/* Level */}
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">المرحلة</span>
            <span className="text-xl font-black text-[#00f0ff]" dir="ltr">{currentQuestionIndex + 1} / {questions.length}</span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">النقاط</span>
            <span className="text-xl font-black text-[#39ff14]" dir="ltr">{score}</span>
          </div>

          {/* Lives */}
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">المحاولات</span>
            <div dir="ltr">{renderHearts()}</div>
          </div>
        </div>
      </div>

      {/* 2. Main layout */}
      <div className="flex-1 w-full min-h-0 flex flex-col lg:flex-row items-stretch justify-center gap-6 lg:gap-12 pb-6">

        {/* Left Side (Actually Right in RTL): Question Display */}
        <div className="glass-panel w-full lg:w-[320px] p-4 text-center flex flex-col items-center justify-center min-h-0 flex-shrink-0 border border-[#00f0ff]/20 shadow-lg rounded-2xl relative overflow-hidden">
          {/* Question Text and/or Image */}
          {currentQuestion && (
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-2">
              {currentQuestion.image ? (
                <>
                  <div className="flex-1 w-full min-h-0 flex items-center justify-center mb-4 relative z-10">
                    <img
                      src={currentQuestion.image}
                      alt="سؤال المتاهة"
                      className="max-w-full max-h-full object-contain drop-shadow-lg"
                    />
                  </div>
                  <div className="text-xl lg:text-3xl text-white font-black text-center leading-relaxed shrink-0 bg-slate-900/60 p-4 rounded-xl border border-white/10 w-full relative z-10 shadow-lg">
                    {currentQuestion.questionText}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full w-full relative">
                  {/* Decorative faint icon */}
                  <Target className="absolute w-64 h-64 text-[#00f0ff] opacity-5 filter blur-sm top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

                  <div className="text-3xl lg:text-5xl text-white font-black text-center leading-relaxed p-8 bg-slate-800/50 rounded-3xl border border-white/20 shadow-xl relative z-10 w-full animate-float">
                    <span className="text-white drop-shadow-lg">
                      {currentQuestion.questionText}
                    </span>
                  </div>
                </div>
              )}

              {/* Optional Audio */}
              {currentQuestion.audioUrl && (
                <div className="w-full shrink-0 flex items-center justify-center mt-3 lg:mt-5">
                  <audio
                    ref={audioRef}
                    src={currentQuestion.audioUrl}
                    onPlay={() => setIsPlayingAudio(true)}
                    onPause={() => setIsPlayingAudio(false)}
                    onEnded={() => setIsPlayingAudio(false)}
                    className="hidden"
                  />
                  <button
                    onClick={toggleAudio}
                    style={{ background: 'transparent', border: 'none', outline: 'none' }}
                    className={`appearance-none bg-transparent border-none outline-none focus:outline-none shadow-none transition-all duration-300 transform active:scale-90 hover:scale-110 ${isPlayingAudio ? 'translate-y-1 opacity-80' : 'animate-[bounce_2.5s_infinite]'
                      }`}
                  >
                    <div className={`filter drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-transform ${isPlayingAudio ? 'animate-pulse text-[#39ff14]' : 'text-[#ff007f]'}`}>
                      {isPlayingAudio ? (
                        <Music className="w-24 h-24 lg:w-40 lg:h-40" />
                      ) : (
                        <Volume2 className="w-24 h-24 lg:w-40 lg:h-40" />
                      )}
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Maze Board */}
        <div className="relative flex-1 flex flex-col items-center justify-center w-full h-full min-h-0 min-w-0 flex-shrink-0">
          {/* Toast Notification overlay */}
          {notification && (
            <div
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-16 py-10 rounded-[3rem] font-black shadow-2xl transition-all duration-300 z-[100] text-7xl md:text-9xl tracking-wider pointer-events-none text-center flex items-center justify-center min-w-[300px] ${
                notification.type === 'success'
                  ? 'bg-black/70 text-[#63FF5D]'
                  : 'bg-black/70 text-[#FF5D5C]'
              }`}
              dir="rtl"
            >
              {notification.text}
            </div>
          )}

          <MazeCanvas
            level={currentQuestionIndex + 1}
            words={shuffledWords}
            correctWord={currentQuestion?.word}
            onCorrect={handleCorrect}
            onWrong={handleWrong}
            onLoseLife={onLoseLife}
            lives={lives}
            isPaused={false}
            externalDirection={extDir}
          />
        </div>

      </div>

    </div>
  );
};
