import React from 'react';
import { UI_TEXT } from '../constants';
import { Icons } from './IconComponents';

interface Props {
  onReturn: () => void;
}

const AnimalMode: React.FC<Props> = ({ onReturn }) => {
  
  const handleRest = () => {
    // Attempt to close the window
    window.close();
    
    // Fallback for mobile browsers that block window.close():
    // Render a "dead" state to simulate closing
    document.body.innerHTML = '';
    document.body.style.backgroundColor = '#1c1917'; // Stone 900
    // Optional: Add a small text to indicate system is off
    const msg = document.createElement('div');
    msg.innerText = "System Sleeping...";
    msg.style.color = "#44403C";
    msg.style.height = "100vh";
    msg.style.display = "flex";
    msg.style.alignItems = "center";
    msg.style.justifyContent = "center";
    document.body.appendChild(msg);
  };

  return (
    <div className="fixed inset-0 bg-stone-900 text-stone-300 z-50 flex flex-col items-center justify-center p-6 transition-colors duration-1000 animate-in fade-in">
      
      <div className="mb-12 opacity-80">
        <Icons.Animal size={80} />
      </div>

      <button 
        onClick={onReturn}
        className="w-full max-w-xs py-8 px-6 bg-stone-800 rounded-3xl border border-stone-700 shadow-2xl active:scale-95 transition-transform"
      >
        <span className="text-2xl font-light text-stone-100 block">
          {UI_TEXT.animalButton}
        </span>
      </button>

      <button 
        onClick={handleRest}
        className="absolute bottom-10 text-stone-600 text-sm hover:text-stone-400 transition-colors p-4"
      >
        {UI_TEXT.animalExit}
      </button>
    </div>
  );
};

export default AnimalMode;