'use client';

import Link from 'next/link';

export default function AdGrid() {
  // Später: Daten aus DB (Table 'ads')
  // Hier das Layout-Gerüst für deine "dezente Werbung" & News
  const boxes = [
    { id: 1, title: "AI News", text: "GPT-5 Audio Modell Release", color: "bg-gray-900 text-white" },
    { id: 2, title: "Partner", text: "Mastering Suite -50%", color: "bg-gray-50 text-gray-900" },
    { id: 3, title: "Event", text: "Creator Summit Berlin", color: "bg-gray-50 text-gray-900" },
    { id: 4, title: "Werbung", text: "Dein Slot hier?", color: "border-2 border-dashed border-gray-200 text-gray-400" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 h-full min-h-[400px]">
      {boxes.map((box) => (
        <div key={box.id} className={`p-6 rounded-xl flex flex-col justify-between ${box.color} hover:scale-[1.02] transition-transform cursor-pointer shadow-sm`}>
           <div>
             <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{box.title}</span>
             <h4 className="font-bold text-sm mt-2 leading-tight">{box.text}</h4>
           </div>
           <div className="text-right">
             <span className="text-xs font-bold uppercase">&rarr;</span>
           </div>
        </div>
      ))}
    </div>
  );
}