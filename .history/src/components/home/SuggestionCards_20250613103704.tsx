import React from 'react';
import { Card } from '@/components/ui/card';
import { Target, Zap, Star, ArrowRight } from 'lucide-react';

interface SuggestionCardsProps {
  onQuerySelect: (query: string) => void;
}

const SuggestionCards = ({ onQuerySelect }: SuggestionCardsProps) => {
  const suggestionCards = [
    {
      title: "Market Analysis",
      prompt: "Analyze current market trends and competitive landscape for",
      icon: <Target className="h-8 w-8" />,
      gradient: "from-emerald-500 via-teal-500 to-cyan-500",
      hoverGradient: "group-hover:from-emerald-400 group-hover:via-teal-400 group-hover:to-cyan-400"
    },
    {
      title: "Technical Research", 
      prompt: "Provide comprehensive technical overview and implementation for",
      icon: <Zap className="h-8 w-8" />,
      gradient: "from-amber-500 via-orange-500 to-red-500",
      hoverGradient: "group-hover:from-amber-400 group-hover:via-orange-400 group-hover:to-red-400"
    },
    {
      title: "Innovation Impact",
      prompt: "Examine industry impact and future implications of",
      icon: <Star className="h-8 w-8" />,
      gradient: "from-violet-500 via-purple-500 to-indigo-500",
      hoverGradient: "group-hover:from-violet-400 group-hover:via-purple-400 group-hover:to-indigo-400"
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {suggestionCards.map((card, index) => (
        <Card
          key={index}
          className="cursor-pointer group relative overflow-hidden border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm hover:scale-105 hover:border-slate-600/70 transition-all duration-500"
          onClick={() => onQuerySelect(card.prompt + " ")}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-5 ${card.hoverGradient} transition-all duration-500`} />
          
          <div className="relative p-6 text-white">
            <div className={`text-transparent bg-gradient-to-r ${card.gradient} bg-clip-text mb-4 group-hover:scale-110 transition-transform duration-300`}>
              {card.icon}
            </div>
            
            <h3 className="font-semibold text-xl mb-3 text-slate-200 group-hover:text-white transition-colors">
              {card.title}
            </h3>
            
            <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors">
              {card.prompt}...
            </p>
            
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default SuggestionCards;
