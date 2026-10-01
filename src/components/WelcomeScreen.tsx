import React from 'react';
import GameWelcomeScreen from './GameWelcomeScreen/GameWelcomeScreen';


import QuestionCoin from '../assets/QuestionCoin.png';
import QuestionNumberBg from '../assets/QuestionNumber.png';
import DescriptionImg from '../assets/description.png';
import DaddCoin from '../assets/daddcoin.webp';
import startBtn from '../assets/start_transparent.png';
import exitBtn from '../assets/Exit1.png';
import { gameAudio } from '../utils/audio';

interface WelcomeScreenProps {
  totalQuestions: number;
  isLoading: boolean;
  error: string | null;
  onStart: () => void;
  onExit?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  totalQuestions,
  isLoading,
  error,
  onStart,
  onExit,
}) => {
  const handleStart = () => {
    gameAudio.playCorrect();
    onStart();
  };

  const xpCount = totalQuestions * 1;
  const isReady = totalQuestions > 0 && !error;

  return (
    <GameWelcomeScreen
      statsBgImage={QuestionNumberBg}
      statLeftIcon={QuestionCoin}
      statLeftAlt="Questions"
      statLeftValue={totalQuestions}
      statRightValue={xpCount}
      statRightIcon={DaddCoin}
      statRightAlt="Dadd Points"
      descriptionImage={DescriptionImg}
      startButtonImage={startBtn}
      exitButtonImage={exitBtn}
      onStart={handleStart}
      onExit={onExit}
      isLoading={isLoading}
      isReady={isReady}
    />
  );
};

export default WelcomeScreen;
