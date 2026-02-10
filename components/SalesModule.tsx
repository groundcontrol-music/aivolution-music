export default function SalesModule({ items }: { items: any[] }) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 border-b border-black bg-white">
      {items.map((item) => (
        <div key={item.id} className="border-r last:border-r-0 border-black p-4 group hover:bg-[#F9F9F9] transition-all cursor-pointer">
          <div className="aspect-square bg-[#EEEEEE] border border-black/10 mb-4 flex items-center justify-center">
             <span className="text-[8px] opacity-20 font-black">COVER_IMG</span>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-red-600 uppercase italic leading-none">
              {item.artist || "Unknown Artist"}
            </p>
            <h4 className="text-[10px] font-black uppercase text-black leading-tight truncate">
              {item.title || "Untitled Track"}
            </h4>
          </div>
        </div>
      ))}
    </section>
  );
}