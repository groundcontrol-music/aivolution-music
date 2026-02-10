'use client';

import React from 'react';
import Link from 'next/link';
import { Check, Zap, Rocket, Star } from 'lucide-react';

const plans = [
  {
    name: 'Standard Creator',
    price: '0,00',
    description: 'Für den Einstieg in die Evolution.',
    features: ['5 Tracks/Monat', 'Basic Profil', 'Community Support'],
    color: 'border-black',
    button: 'Start Free'
  },
  {
    name: 'Power Creator',
    price: '23,99',
    description: 'Maximale Power für Profis.',
    features: ['Unbegrenzt Tracks', 'Custom URL (Slug)', 'Priority Support', 'Massive Storage'],
    color: 'border-red-600',
    highlight: true,
    button: 'Get Power'
  }
];

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-white text-black p-8">
      <header className="max-w-[1200px] mx-auto text-center mb-20">
        <h1 className="text-7xl md:text-9xl font-black uppercase italic tracking-tighter mb-6">
          Wähle deine <span className="text-red-600">Stufe.</span>
        </h1>
        <p className="text-xl font-bold uppercase tracking-widest">
          Werde Teil der Aivolution und starte deine Plattform.
        </p>
      </header>

      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        {plans.map((plan) => (
          <div 
            key={plan.name}
            className={`relative p-12 border-[6px] ${plan.color} rounded-[2.5rem] shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-2`}
          >
            {plan.highlight && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-2 rounded-full font-black uppercase italic border-4 border-black">
                Most Wanted
              </div>
            )}
            
            <h3 className="text-4xl font-black uppercase italic mb-2">{plan.name}</h3>
            <div className="flex items-end gap-2 mb-6">
              <span className="text-6xl font-black">{plan.price}€</span>
              <span className="text-gray-500 font-bold uppercase pb-2">/ Monat</span>
            </div>
            
            <p className="font-bold mb-10 text-lg">{plan.description}</p>
            
            <ul className="space-y-4 mb-12">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 font-black uppercase italic text-sm">
                  <div className="bg-red-600 p-1 rounded-full text-white">
                    <Check size={16} strokeWidth={4} />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <Link 
              href={`/join/checkout?plan=${plan.name.toLowerCase()}`}
              className={`block w-full text-center py-6 rounded-[2rem] font-black uppercase text-xl border-4 border-black transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 ${
                plan.highlight ? 'bg-red-600 text-white' : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              {plan.button}
            </Link>
          </div>
        ))}
      </div>

      <footer className="mt-20 text-center text-[10px] font-black uppercase tracking-[0.3em] opacity-30">
        System-Check: Legal & DAC7 Ready // Aivolution Infrastructure
      </footer>
    </div>
  );
}